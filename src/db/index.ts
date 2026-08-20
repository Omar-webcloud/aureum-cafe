/**
 * In-memory fake database that mimics the Drizzle ORM query-builder API
 * surface used by this app. No PostgreSQL connection required.
 *
 * Supported chains:
 *   db.select()       .from(table)  .where(pred) .orderBy(fn) .limit(n)
 *   db.select({…})    .from(table)  …
 *   db.insert(table)  .values(data) .returning()
 *   db.update(table)  .set(patch)   .where(pred) .returning()
 *   db.transaction(fn)
 *   db.execute(sql`…`)
 */

import { menuItems, orderItems, orders } from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*  Storage                                                                    */
/* -------------------------------------------------------------------------- */

export type Row = Record<string, unknown>;

const store = new Map<unknown, Row[]>();
const sequences = new Map<unknown, number>();

function tableRows(table: unknown): Row[] {
  if (!store.has(table)) store.set(table, []);
  return store.get(table)!;
}

function nextId(table: unknown): number {
  const current = sequences.get(table) ?? 0;
  const next = current + 1;
  sequences.set(table, next);
  return next;
}

/* -------------------------------------------------------------------------- */
/*  Predicate helpers – resolve Drizzle `eq` / `inArray` style filters        */
/* -------------------------------------------------------------------------- */

/**
 * Drizzle operators (eq, inArray, etc.) return objects that carry the column
 * reference + the comparison value. We duck-type detect them and evaluate
 * against a row. If the shape is unrecognised we return `true` (no filter).
 */
function evaluatePredicate(pred: unknown, row: Row): boolean {
  if (!pred || typeof pred !== "object") return true;

  const p = pred as Record<string, unknown>;

  // drizzle-orm internal SQL node – walk the queryChunks
  if (Array.isArray((p as any).queryChunks)) {
    return evaluateChunks((p as any).queryChunks, row);
  }

  return true;
}

function evaluateChunks(chunks: unknown[], row: Row): boolean {
  // `eq(col, value)` produces chunks like [column, " = ", param]
  // `inArray(col, values)` produces chunks like [column, " in ", "(", param, ")"]
  // We try to extract column name + value for basic equality / in checks.

  let colName: string | null = null;
  let operator: string | null = null;
  const values: unknown[] = [];

  for (const chunk of chunks) {
    if (chunk && typeof chunk === "object") {
      const c = chunk as Record<string, unknown>;
      // Column reference
      if (typeof c.name === "string" && c.table) {
        colName = camelCase(c.name);
      }
      // Param value
      if ("value" in c && c.value !== undefined) {
        values.push((c as any).value);
      }
      // Nested chunks (e.g. wrapped SQL)
      if (Array.isArray(c.queryChunks)) {
        return evaluateChunks(c.queryChunks, row);
      }
    }
    if (typeof chunk === "string") {
      const trimmed = chunk.trim().toLowerCase();
      if (trimmed === "=") operator = "eq";
      if (trimmed === "in") operator = "in";
    }
  }

  if (!colName) return true;
  const rowValue = row[colName];

  if (operator === "eq" && values.length > 0) {
    return rowValue === values[0];
  }
  if (operator === "in" && values.length > 0) {
    const arr = Array.isArray(values[0]) ? values[0] : values;
    return arr.includes(rowValue);
  }

  return true;
}

/** snake_case → camelCase */
function camelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/* -------------------------------------------------------------------------- */
/*  OrderBy helper                                                             */
/* -------------------------------------------------------------------------- */

function resolveOrderBy(orderArg: unknown): { col: string; dir: "asc" | "desc" } | null {
  if (!orderArg || typeof orderArg !== "object") return null;
  const o = orderArg as Record<string, unknown>;

  // asc(column) / desc(column) produce SQL nodes with queryChunks
  if (Array.isArray((o as any).queryChunks)) {
    for (const chunk of (o as any).queryChunks) {
      if (chunk && typeof chunk === "object" && typeof (chunk as any).name === "string") {
        const colName = camelCase((chunk as any).name);
        // Check surrounding text for "desc"
        const text = (o as any).queryChunks
          .filter((c: unknown) => typeof c === "string")
          .join(" ")
          .toLowerCase();
        const dir = text.includes("desc") ? "desc" : "asc";
        return { col: colName, dir };
      }
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Projection helper                                                          */
/* -------------------------------------------------------------------------- */

function applyProjection(rows: Row[], fields: Record<string, unknown> | undefined): Row[] {
  if (!fields) return rows;

  return rows.map((row) => {
    const projected: Row = {};
    for (const [alias, expr] of Object.entries(fields)) {
      if (expr && typeof expr === "object") {
        const e = expr as any;
        // count() aggregate
        if (e.queryChunks || (typeof e.mapWith === "function")) {
          // Return a dummy count — callers check > 0, and we recalculate below
          projected[alias] = null; // placeholder; handled at the chain level
          continue;
        }
      }
      projected[alias] = row[alias];
    }
    return projected;
  });
}

/* -------------------------------------------------------------------------- */
/*  Query-builder (fake Drizzle db)                                            */
/* -------------------------------------------------------------------------- */

function createSelectChain(fields?: Record<string, unknown>) {
  return {
    from(table: unknown) {
      let rows = [...tableRows(table)];
      let predicate: unknown = undefined;
      let orderFn: unknown = undefined;
      let limitN: number | undefined = undefined;

      // Is this a count() select?
      const isCount =
        fields &&
        Object.values(fields).some((v) => {
          if (!v || typeof v !== "object") return false;
          const sql = (v as any).queryChunks;
          if (Array.isArray(sql)) {
            return sql.some((c: unknown) => typeof c === "string" && c.toLowerCase().includes("count"));
          }
          return false;
        });

      const chain = {
        where(pred: unknown) {
          predicate = pred;
          return chain;
        },
        orderBy(fn: unknown) {
          orderFn = fn;
          return chain;
        },
        limit(n: number) {
          limitN = n;
          return chain;
        },
        then(resolve: (value: Row[]) => void, reject?: (reason?: unknown) => void) {
          try {
            let result = [...tableRows(table)];

            if (predicate) {
              result = result.filter((row) => evaluatePredicate(predicate, row));
            }

            const order = resolveOrderBy(orderFn);
            if (order) {
              result.sort((a, b) => {
                const av = a[order.col];
                const bv = b[order.col];
                if (typeof av === "number" && typeof bv === "number") {
                  return order.dir === "asc" ? av - bv : bv - av;
                }
                return order.dir === "asc"
                  ? String(av).localeCompare(String(bv))
                  : String(bv).localeCompare(String(av));
              });
            }

            if (limitN !== undefined) {
              result = result.slice(0, limitN);
            }

            if (isCount) {
              const key = Object.keys(fields!)[0];
              resolve([{ [key]: result.length }] as unknown as Row[]);
              return;
            }

            if (fields) {
              result = applyProjection(result, fields);
            }

            resolve(result);
          } catch (err) {
            if (reject) reject(err);
          }
        },
      };

      return chain;
    },
  };
}

function createInsertChain(table: unknown) {
  let rowsToInsert: Row[] = [];

  const chain = {
    values(data: Row | Row[]) {
      rowsToInsert = Array.isArray(data) ? data : [data];
      // Execute the insert immediately (for non-returning calls)
      const inserted = rowsToInsert.map((r) => {
        const newRow: Row = { id: nextId(table), ...r };
        tableRows(table).push(newRow);
        return { ...newRow };
      });

      return {
        returning() {
          return {
            then(resolve: (value: Row[]) => void) {
              resolve(inserted);
            },
          };
        },
        then(resolve: (value: void) => void) {
          resolve(undefined);
        },
      };
    },
  };

  return chain;
}

function createUpdateChain(table: unknown) {
  let patch: Row = {};

  const chain = {
    set(data: Row) {
      patch = data;
      return {
        where(pred: unknown) {
          return {
            returning() {
              return {
                then(resolve: (value: Row[]) => void) {
                  const rows = tableRows(table);
                  const updated: Row[] = [];
                  for (const row of rows) {
                    if (evaluatePredicate(pred, row)) {
                      Object.assign(row, patch);
                      updated.push({ ...row });
                    }
                  }
                  resolve(updated);
                },
              };
            },
            then(resolve: (value: void) => void) {
              const rows = tableRows(table);
              for (const row of rows) {
                if (evaluatePredicate(pred, row)) {
                  Object.assign(row, patch);
                }
              }
              resolve(undefined);
            },
          };
        },
      };
    },
  };

  return chain;
}

/* -------------------------------------------------------------------------- */
/*  Exported fake `db`                                                         */
/* -------------------------------------------------------------------------- */

export const db = {
  select(fields?: Record<string, unknown>) {
    return createSelectChain(fields);
  },

  insert(table: unknown) {
    return createInsertChain(table);
  },

  update(table: unknown) {
    return createUpdateChain(table);
  },

  async transaction<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
    // No real transaction support needed – just run the callback with `db`
    return fn(db);
  },

  async execute(_sql: unknown) {
    // Swallow raw SQL calls (e.g. health-check `select 1`)
    return [{ "?column?": 1 }];
  },
};

/* -------------------------------------------------------------------------- */
/*  Also export a stub `pool` for anything that imports it                     */
/* -------------------------------------------------------------------------- */

export const pool = {
  query: async () => ({ rows: [] }),
  end: async () => {},
};
