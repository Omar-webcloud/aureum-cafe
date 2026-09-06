"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, ExternalLink, ShoppingCart, MapPin, Navigation } from "lucide-react";
import { useCart } from "./cart-context";
import { formatUsd } from "@/lib/money";
import type { MenuItemDTO } from "@/lib/types";
import type { BaristaReply } from "@/lib/ai/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionChip = {
  icon: string;
  label: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  chip?: ActionChip;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseReply(raw: string): BaristaReply {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.type === "string") return parsed as BaristaReply;
  } catch {}
  // Fallback: treat entire string as plain text
  return { type: "text", content: raw };
}

function chipForReply(reply: BaristaReply): ActionChip | undefined {
  switch (reply.type) {
    case "navigate": return { icon: "↗", label: `Scrolled to ${reply.anchor}` };
    case "whatsapp": return { icon: "💬", label: "Opened WhatsApp" };
    case "formFill": return { icon: "📋", label: "Order form filled" };
    case "openCart": return { icon: "🛒", label: "Cart opened" };
    default:         return undefined;
  }
}

function messageTextForReply(reply: BaristaReply): string {
  switch (reply.type) {
    case "text":     return reply.content;
    case "navigate": return reply.message;
    case "whatsapp": return reply.message;
    case "formFill": return reply.message;
    case "openCart": return reply.message;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiBaristaWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI Barista. I know everything about Aureum — our menu, story, hours, and ordering. I can also take you to any part of the page, open WhatsApp, or fill in your order form. What can I do for you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addItem, openCart, fillForm } = useCart();
  const [activeTab, setActiveTab] = useState<"chat" | "recommend" | "order">("chat");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<MenuItemDTO[]>([]);

  // Load catalog for recommend/order tabs
  useEffect(() => {
    fetch("/api/menu")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setCatalog(data.items);
      })
      .catch((err) => console.error("Error fetching menu for AI Barista:", err));
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, recommendations]);

  // ─── Action executor ────────────────────────────────────────────────────────

  function executeAction(reply: BaristaReply) {
    switch (reply.type) {
      case "navigate": {
        const el = document.querySelector(reply.anchor);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          // fallback: hash navigation
          window.location.hash = reply.anchor;
        }
        // Close widget so the section is fully visible
        setIsOpen(false);
        break;
      }
      case "whatsapp": {
        window.open(reply.waUrl, "_blank", "noopener,noreferrer");
        break;
      }
      case "formFill": {
        fillForm({
          name:   reply.name,
          phone:  reply.phone,
          pickup: reply.pickup,
          notes:  reply.notes,
        });
        // Cart is opened automatically by fillForm()
        setIsOpen(false);
        break;
      }
      case "openCart": {
        openCart();
        setIsOpen(false);
        break;
      }
      // "text" — no side effect, just display the message
    }
  }

  // ─── Send message ────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    try {
      if (activeTab === "order") {
        // Natural language → cart parsing
        const res = await fetch("/api/ai/barista", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "parseOrder", text: userMsg }),
        });
        const data = await res.json();

        if (data.parsedOrder?.ok && data.parsedOrder.items.length > 0) {
          const addedDetails: string[] = [];
          data.parsedOrder.items.forEach((item: any) => {
            const product = catalog.find((p) => p.id === item.productId);
            if (product) {
              addItem(product, item.quantity);
              addedDetails.push(`• ${item.quantity}× ${product.name}`);
            }
          });

          if (addedDetails.length > 0) {
            const msg = `I've added the following to your cart:\n${addedDetails.join("\n")}\n\nYour tray is open — fill in your details to place the order!`;
            setMessages((prev) => [...prev, { role: "assistant", content: msg, chip: { icon: "🛒", label: "Items added to cart" } }]);
          } else {
            setMessages((prev) => [...prev, { role: "assistant", content: "I parsed your order but couldn't find those items in our active catalog." }]);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.parsedOrder?.error || "I couldn't understand that order. Could you rephrase?" },
          ]);
        }
      } else {
        // Chat tab — structured reply
        const chatHistory = messages.map((m) => ({ role: m.role, content: m.content }));
        chatHistory.push({ role: "user", content: userMsg });

        const res = await fetch("/api/ai/barista", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "chat", messages: chatHistory }),
        });
        const data = await res.json();

        if (data.reply) {
          const reply = parseReply(data.reply);
          const text = messageTextForReply(reply);
          const chip = chipForReply(reply);

          setMessages((prev) => [...prev, { role: "assistant", content: text, chip }]);
          executeAction(reply);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble thinking right now." }]);
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Oops, something went wrong connecting to my brain!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Recommendations ─────────────────────────────────────────────────────────

  const getRecommendations = async () => {
    if (preferences.length === 0) return;
    setIsTyping(true);
    setRecommendations([]);

    try {
      const res = await fetch("/api/ai/barista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recommend", preferences }),
      });
      const data = await res.json();
      if (data.recommendations) setRecommendations(data.recommendations);
    } catch {
      console.error("Recommendation fetch failed");
    } finally {
      setIsTyping(false);
    }
  };

  // ─── Quick-action pills shown in chat tab ────────────────────────────────────

  const quickActions = [
    { label: "📍 Where are you?",    msg: "Where is Aureum located?" },
    { label: "🕐 Opening hours",     msg: "What are your opening hours?" },
    { label: "📖 Our story",         msg: "Tell me about Aureum's story." },
    { label: "🫘 Coffee origins",    msg: "Where does your coffee come from?" },
    { label: "🛒 How to order",      msg: "How do I place an order?" },
    { label: "💬 Order on WhatsApp", msg: "I want to order on WhatsApp." },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 left-5 md:bottom-5 z-40 bg-zinc-900 text-amber-500 p-4 rounded-full shadow-2xl border border-amber-500/20 hover:scale-105 transition-all flex items-center gap-2 ${isOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <Sparkles size={20} />
        <span className="font-medium tracking-wide">Ask AI Barista</span>
      </button>

      {/* Widget panel */}
      {isOpen && (
        <div className="fixed bottom-24 left-4 w-[calc(100%-2rem)] md:bottom-5 md:left-5 md:w-full max-w-sm sm:max-w-md h-[640px] max-h-[calc(100dvh-8rem)] md:max-h-[82vh] bg-zinc-950/97 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                <Sparkles size={18} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-zinc-100 font-semibold text-lg leading-tight">AI Barista</h3>
                <p className="text-amber-500/80 text-xs font-medium tracking-wider uppercase">Full site access</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            {(["chat", "recommend", "order"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab ? "text-amber-500 border-b-2 border-amber-500" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab === "chat" ? "Chat & Q&A" : tab === "recommend" ? "Help Me Choose" : "Order"}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ── Recommend tab ── */}
            {activeTab === "recommend" ? (
              <div className="space-y-6">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <h4 className="text-zinc-200 font-medium mb-3">What are you in the mood for?</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Hot", "Cold", "Sweet", "Not sweet", "Strong coffee", "Dairy-free", "Pastry"].map((pref) => (
                      <button
                        key={pref}
                        onClick={() =>
                          setPreferences((prev) =>
                            prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          preferences.includes(pref)
                            ? "bg-amber-500 text-zinc-950"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {pref}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={getRecommendations}
                    disabled={preferences.length === 0 || isTyping}
                    className="w-full mt-4 bg-zinc-100 text-zinc-950 font-semibold py-2 rounded-lg disabled:opacity-50 hover:bg-white transition-colors"
                  >
                    {isTyping ? "Finding your drink…" : "Find My Drink"}
                  </button>
                </div>

                {recommendations.length > 0 && (
                  <div className="space-y-4">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex">
                        <img src={rec.product.imageUrl} alt={rec.product.name} className="w-24 h-24 object-cover" />
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-zinc-100 font-medium">{rec.product.name}</h4>
                            <p className="text-zinc-400 text-xs mt-1 line-clamp-2">{rec.explanation}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-amber-500 font-semibold text-sm">{formatUsd(rec.product.priceCents)}</span>
                            <button
                              onClick={() => addItem(rec.product)}
                              className="bg-amber-500 text-zinc-950 text-xs font-semibold px-3 py-1 rounded-full hover:bg-amber-400"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            ) : (
              /* ── Chat & Order tabs ── */
              <>
                {/* Quick actions (chat tab only, first message only) */}
                {activeTab === "chat" && messages.length === 1 && (
                  <div className="space-y-2">
                    <p className="text-zinc-600 text-xs uppercase tracking-widest font-medium">Quick actions</p>
                    <div className="flex flex-wrap gap-2">
                      {quickActions.map((qa) => (
                        <button
                          key={qa.label}
                          onClick={() => {
                            setInput(qa.msg);
                            setTimeout(() => {
                              setInput("");
                              setMessages((prev) => [...prev, { role: "user", content: qa.msg }]);
                              setIsTyping(true);
                              fetch("/api/ai/barista", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "chat",
                                  messages: [
                                    ...messages.map((m) => ({ role: m.role, content: m.content })),
                                    { role: "user", content: qa.msg },
                                  ],
                                }),
                              })
                                .then((r) => r.json())
                                .then((data) => {
                                  if (data.reply) {
                                    const reply = parseReply(data.reply);
                                    setMessages((prev) => [
                                      ...prev,
                                      { role: "assistant", content: messageTextForReply(reply), chip: chipForReply(reply) },
                                    ]);
                                    executeAction(reply);
                                  }
                                })
                                .catch(() => {
                                  setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong." }]);
                                })
                                .finally(() => setIsTyping(false));
                            }, 0);
                          }}
                          className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-full hover:border-amber-500/50 hover:text-amber-400 transition-all"
                        >
                          {qa.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order tab hint */}
                {activeTab === "order" && messages.length === 1 && (
                  <div className="bg-zinc-900/50 p-3 rounded-lg border border-amber-500/20 text-sm text-zinc-300">
                    <strong className="text-amber-500">Hint:</strong> Type a natural order like:
                    <br />
                    <em className="text-zinc-400">"I want 2 iced lattes with oat milk and a butter croissant."</em>
                  </div>
                )}

                {/* Messages */}
                {messages.map((msg, index) => (
                  <div key={index} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-amber-500 text-zinc-950 rounded-br-none font-medium"
                          : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none leading-relaxed"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {/* Action chip */}
                    {msg.chip && (
                      <div className="mt-1.5 flex items-center gap-1.5 px-1">
                        <span className="text-xs">{msg.chip.icon}</span>
                        <span className="text-[11px] text-zinc-500 tracking-wide">{msg.chip.label}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-2xl rounded-bl-none p-3 px-4 flex gap-1">
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input bar (chat & order tabs) */}
          {(activeTab === "chat" || activeTab === "order") && (
            <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={activeTab === "order" ? "Type your order…" : "Ask me anything about Aureum…"}
                  className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-zinc-600"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-1.5 p-2 bg-amber-500 text-zinc-950 rounded-full disabled:opacity-50 hover:bg-amber-400 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
