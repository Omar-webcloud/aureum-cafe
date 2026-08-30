"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Coffee, Utensils, ChevronDown } from "lucide-react";
import { useCart } from "./cart-context";
import { formatUsd } from "@/lib/money";
import type { MenuItemDTO } from "@/lib/types";

type Message = {
  role: "user" | "assistant";
  content: string;
  isOrderParse?: boolean;
};

export function AiBaristaWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI Barista. I can help you find drinks, suggest recommendations, or take your order directly!" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addItem, openCart } = useCart();
  const [activeTab, setActiveTab] = useState<"chat" | "recommend" | "order">("chat");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<MenuItemDTO[]>([]);

  useEffect(() => {
    fetch("/api/menu")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setCatalog(data.items);
        }
      })
      .catch((err) => console.error("Error fetching menu for AI Barista:", err));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, recommendations]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    try {
      if (activeTab === "order") {
        const res = await fetch("/api/ai/barista", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "parseOrder", text: userMsg })
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
            const msg = `I've added the following to your cart:\n${addedDetails.join("\n")}\n\nI've opened your tray so you can review and place the order!`;
            setMessages(prev => [...prev, { role: "assistant", content: msg, isOrderParse: true }]);
            openCart();
          } else {
            setMessages(prev => [...prev, { role: "assistant", content: "I parsed your order but couldn't find those items in our active catalog." }]);
          }
        } else {
          setMessages(prev => [...prev, { role: "assistant", content: data.parsedOrder?.error || "I couldn't understand that order. Could you rephrase?" }]);
        }
      } else {
        const chatHistory = messages.map(m => ({ role: m.role, content: m.content }));
        chatHistory.push({ role: "user", content: userMsg });

        const res = await fetch("/api/ai/barista", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "chat", messages: chatHistory })
        });
        const data = await res.json();
        
        if (data.reply) {
          setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble thinking right now." }]);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "Oops, something went wrong connecting to my brain!" }]);
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

  const getRecommendations = async () => {
    if (preferences.length === 0) return;
    setIsTyping(true);
    setRecommendations([]);
    
    try {
      const res = await fetch("/api/ai/barista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recommend", preferences })
      });
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 left-5 md:bottom-5 z-40 bg-zinc-900 text-amber-500 p-4 rounded-full shadow-2xl border border-amber-500/20 hover:scale-105 transition-all flex items-center gap-2 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <Sparkles size={20} />
        <span className="font-medium tracking-wide">Ask AI Barista</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 left-4 w-[calc(100%-2rem)] md:bottom-5 md:left-5 md:w-full max-w-sm sm:max-w-md h-[600px] max-h-[calc(100dvh-8rem)] md:max-h-[80vh] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden transform transition-all duration-300 ease-out">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                <Sparkles size={18} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-zinc-100 font-semibold text-lg leading-tight">AI Barista</h3>
                <p className="text-amber-500/80 text-xs font-medium tracking-wider uppercase">Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="flex border-b border-zinc-800">
            <button 
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'chat' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Chat & Q&A
            </button>
            <button 
              onClick={() => setActiveTab("recommend")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'recommend' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Help Me Choose
            </button>
            <button 
              onClick={() => setActiveTab("order")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTab === 'order' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Order
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "recommend" ? (
              <div className="space-y-6">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <h4 className="text-zinc-200 font-medium mb-3">What are you in the mood for?</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Hot", "Cold", "Sweet", "Not sweet", "Strong coffee", "Dairy-free", "Pastry"].map(pref => (
                      <button
                        key={pref}
                        onClick={() => setPreferences(prev => prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref])}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${preferences.includes(pref) ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
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
                    Find My Drink
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
              <>
                {activeTab === "order" && messages.length === 1 && (
                  <div className="bg-zinc-900/50 p-3 rounded-lg border border-amber-500/20 text-sm text-zinc-300">
                    <strong className="text-amber-500">Hint:</strong> You can type natural orders here like: <br/>
                    <em className="text-zinc-400">"I want 2 iced lattes with oat milk and a butter croissant."</em>
                  </div>
                )}
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-amber-500 text-zinc-950 rounded-br-none font-medium' : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-bl-none leading-relaxed'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-2xl rounded-bl-none p-3 px-4 flex gap-1">
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {(activeTab === "chat" || activeTab === "order") && (
            <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={activeTab === 'order' ? "Type your order..." : "Ask me anything..."}
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
