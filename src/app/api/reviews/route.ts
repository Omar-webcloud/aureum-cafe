import { db } from "@/db";
import { reviews } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const allReviews = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
  return Response.json({ reviews: allReviews });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, rating, comment, category } = body;
    
    if (!customerName || !rating || !comment) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    const [inserted] = await db.insert(reviews).values({
      customerName,
      rating: Number(rating),
      comment,
      category: category || null
    }).returning();
    
    return Response.json({ review: inserted });
  } catch (error) {
    return Response.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
