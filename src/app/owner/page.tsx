"use client";

import { useEffect, useState, useRef } from "react";
import { formatUsd } from "@/lib/money";
import { TrendingUp, TrendingDown, Minus, MessageSquare, Target, Activity, Send, Sparkles } from "lucide-react";
import Link from "next/link";

export default function OwnerDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  
  const [analytics, setAnalytics] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [reviewAnalysis, setReviewAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([
    { role: "assistant", content: "Hello! I'm your AI Owner Assistant. Ask me anything about your business metrics or menu." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatTyping, setChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, insightsRes, reviewsRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/ai/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "insights" }) }),
        fetch("/api/ai/owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reviewsAnalysis" }) })
      ]);
      
      const analyticsData = await analyticsRes.json();
      const insightsData = await insightsRes.json();
      const reviewsData = await reviewsRes.json();

      setAnalytics(analyticsData);
      setInsights(insightsData.insights || []);
      setReviewAnalysis(reviewsData.analysis || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "1234") {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect PIN. Try 1234");
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    
    const newMsg = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput("");
    setChatTyping(true);

    try {
      const res = await fetch("/api/ai/owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", messages: [...chatMessages, newMsg] })
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Error connecting to assistant." }]);
    } finally {
      setChatTyping(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl">
          <h1 className="text-2xl font-semibold text-zinc-100 mb-2">Owner Portal</h1>
          <p className="text-zinc-400 mb-6 text-sm">Enter passcode to access business analytics.</p>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input 
              type="password" 
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter PIN (1234)"
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
            <button type="submit" className="w-full bg-amber-500 text-zinc-950 font-semibold py-3 rounded-lg hover:bg-amber-400 transition-colors">
              Unlock Dashboard
            </button>
          </form>
          <div className="mt-4 text-center">
             <Link href="/" className="text-amber-500 text-sm hover:underline">Back to Store</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold">Business Overview</h1>
            <p className="text-zinc-400 mt-1">Real-time metrics and AI generated insights</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData} className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm hover:bg-zinc-800 transition">
              Refresh Data
            </button>
            <Link href="/" className="px-4 py-2 bg-amber-500 text-zinc-950 font-semibold rounded-lg text-sm hover:bg-amber-400 transition">
              View Storefront
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Metrics & Reviews */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-zinc-400 text-sm font-medium mb-1">Total Revenue</p>
                  <h3 className="text-3xl font-semibold">{formatUsd(analytics?.totalRevenueCents || 0)}</h3>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-zinc-400 text-sm font-medium mb-1">Total Orders</p>
                  <h3 className="text-3xl font-semibold">{analytics?.totalOrders || 0}</h3>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-zinc-400 text-sm font-medium mb-1">Average Order Value</p>
                  <h3 className="text-3xl font-semibold">{formatUsd(analytics?.avgOrderValueCents || 0)}</h3>
                </div>
              </div>

              {/* AI Insights */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  <h3 className="font-semibold text-lg">AI Business Insights</h3>
                </div>
                <div className="p-5 space-y-4">
                  {insights.length === 0 ? (
                    <p className="text-zinc-400 text-sm italic">No insights available right now.</p>
                  ) : (
                    insights.map((insight, idx) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                        <div className={`mt-1 ${insight.type === 'positive' ? 'text-green-500' : insight.type === 'negative' ? 'text-red-500' : 'text-amber-500'}`}>
                          {insight.type === 'positive' ? <TrendingUp size={20} /> : insight.type === 'negative' ? <TrendingDown size={20} /> : <Activity size={20} />}
                        </div>
                        <div>
                          <h4 className="font-medium text-zinc-100">{insight.title}</h4>
                          <p className="text-zinc-400 text-sm mt-1">{insight.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Review Analysis */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
                  <Target size={18} className="text-amber-500" />
                  <h3 className="font-semibold text-lg">AI Customer Sentiment Analysis</h3>
                </div>
                <div className="p-5">
                  <div className="flex flex-col md:flex-row gap-8 items-center mb-6">
                    <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-zinc-800">
                      <div className="absolute text-2xl font-bold text-amber-500">{reviewAnalysis?.positivePercentage || 0}%</div>
                      <svg className="absolute top-[-8px] left-[-8px] w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" className="text-amber-500" strokeDasharray="377" strokeDashoffset={377 - (377 * (reviewAnalysis?.positivePercentage || 0)) / 100} strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex justify-between items-center p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                        <span className="text-zinc-400 text-sm">Most Praised</span>
                        <span className="font-medium text-green-400">{reviewAnalysis?.mostPraised || "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                        <span className="text-zinc-400 text-sm">Most Complained</span>
                        <span className="font-medium text-red-400">{reviewAnalysis?.mostComplained || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 mt-6 border-t border-zinc-800 pt-6">
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">Key Customer Quotes</h4>
                    {(reviewAnalysis?.sampleQuotes || []).map((quote: string, i: number) => (
                      <blockquote key={i} className="pl-4 border-l-2 border-amber-500 text-zinc-400 italic text-sm py-1">
                        "{quote}"
                      </blockquote>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: AI Assistant */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-[700px] lg:h-auto overflow-hidden">
              <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
                <MessageSquare size={18} className="text-amber-500" />
                <h3 className="font-semibold text-lg">AI Owner Assistant</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-amber-500 text-zinc-950 rounded-br-none font-medium' : 'bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-bl-none leading-relaxed'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatTyping && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl rounded-bl-none p-3 px-4 flex gap-1">
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    placeholder="Ask about sales, trends..."
                    className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    onClick={sendChat}
                    disabled={!chatInput.trim() || chatTyping}
                    className="absolute right-1.5 p-2 bg-amber-500 text-zinc-950 rounded-full disabled:opacity-50 hover:bg-amber-400 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
