'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Sparkles, User, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export default function DeepDiveContent({ movie }: { movie: any }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: `Analyzing **${movie.title}**. What secrets shall we uncover?`, sender: 'ai' }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "" || isSending) return;

    const userText = inputMessage;
    const userMsgId = Date.now();
    const aiMsgId = userMsgId + 1;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, text: userText, sender: 'user' },
      { id: aiMsgId, text: "", sender: 'ai' }
    ]);
    setInputMessage("");
    setIsSending(true);

    try {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${primaryApiUrl}/deep_dive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movie: `${movie.title} (${new Date(movie.release_date).getFullYear()})`,
          question: userText,
          thread_id: `thread_${movie.id}`,
          persona: "critic"
        })
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.token) {
                fullText += data.token;
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMsgId ? { ...msg, text: fullText } : msg
                ));
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[700px] rounded-3xl bg-[#0d1117]/50 border border-white/5 overflow-hidden shadow-2xl">
      {/* Header Info */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
            <User size={16} />
          </div>
          <span className="text-sm font-bold tracking-tighter uppercase text-slate-500">RAG Analysis Engine</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] prose prose-invert prose-sm p-5 rounded-2xl ${
              m.sender === 'user' 
                ? 'bg-blue-600 rounded-tr-none' 
                : 'bg-white/5 border border-white/10 rounded-tl-none'
            }`}>
              <ReactMarkdown>{m.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isSending && messages[messages.length-1]?.text === "" && (
          <div className="flex justify-start">
            <div className="p-5 rounded-2xl rounded-tl-none bg-white/5 border border-white/10 flex items-center gap-2 text-slate-500 italic">
              <Loader2 className="animate-spin" size={14} />
              Thinking...
            </div>
          </div>
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-slate-950/50 border-t border-white/5">
        <div className="relative group">
          <textarea 
            rows={1}
            placeholder="Ask anything about the narrative structure..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 flex-1 pl-6 pr-16 text-slate-200 outline-none focus:border-blue-500/50 transition-all resize-none overflow-hidden"
          />
          <button 
            disabled={isSending || !inputMessage.trim()}
            onClick={handleSendMessage}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center hover:bg-blue-500 transition-all disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
