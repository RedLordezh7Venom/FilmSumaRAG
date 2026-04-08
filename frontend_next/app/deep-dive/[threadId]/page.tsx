"use client"

import { useState, useEffect, useRef, use } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Sparkles, User, Zap, MessageSquare, ThumbsUp, ThumbsDown, ArrowLeft } from 'lucide-react';
import { Typewriter } from "@/components/effects/typewriter";
import Link from 'next/link';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  feedback?: 'up' | 'down';
}

export default function DeepDiveChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: `AUTHENTICATING_THREAD_SESSION... [ID: ${threadId.substring(0,8)}]`, sender: 'ai' }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleFeedback = async (msgId: number, type: 'up' | 'down') => {
    // Optimistic UI
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: type } : m));
    
    try {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
      await fetch(`${primaryApiUrl}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movie_title: "Active Movie",
          chat_id: msgId,
          rating: type === 'up' ? 1 : 0,
          downvote: type === 'down',
          persona: "critic"
        })
      });
    } catch (err) {
      console.error("Feedback error:", err);
    }
  };

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
          movie: "Active Movie",
          question: userText,
          thread_id: threadId,
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
    <div className="min-h-screen bg-[#0b0f17] flex flex-col items-center py-20 px-8 font-sans selection:bg-white selection:text-black">
      <div className="film-grain" />
      
      <div className="max-w-5xl w-full flex flex-col h-[80vh] glass-surface rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10">
        
        {/* Cinematic Header */}
        <header className="p-10 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
             <Link href="/" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                <ArrowLeft size={20} />
             </Link>
             <div>
                <div className="text-criterion opacity-30">Archive_Analysis / Secure_Stream /</div>
                <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none mt-1">Deep Dive Session</h2>
             </div>
          </div>
          <div className="text-right">
             <div className="text-criterion opacity-30 text-[9px]">THREAD_ID</div>
             <div className="text-white font-mono text-xs font-bold">{threadId.substring(0,18)}...</div>
          </div>
        </header>

        {/* Messaging Area */}
        <div className="flex-1 overflow-y-auto p-12 space-y-16 custom-scrollbar">
          {messages.map((m, idx) => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] space-y-4 ${m.sender === 'user' ? 'text-right' : 'text-left'}`}>
                
                {m.sender === 'ai' ? (
                   <div className="space-y-6">
                     <div className="text-criterion opacity-20 text-[9px]">CRITIC_RESPONSE</div>
                     <div className="text-white font-serif italic text-2xl leading-relaxed">
                        <Typewriter text={m.text} speed={10} key={m.id} delay={idx === 0 ? 500 : 0} />
                     </div>
                     
                     <div className="flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleFeedback(m.id, 'up')}
                          className={`flex items-center gap-2 text-[9px] text-criterion transition-colors ${m.feedback === 'up' ? 'text-white' : 'opacity-20 hover:opacity-100'}`}
                        >
                          <ThumbsUp size={12} /> VALIDATE_CONTEXT
                        </button>
                        <button 
                          onClick={() => handleFeedback(m.id, 'down')}
                          className={`flex items-center gap-2 text-[9px] text-criterion transition-colors ${m.feedback === 'down' ? 'text-red-500' : 'opacity-20 hover:opacity-100'}`}
                        >
                          <ThumbsDown size={12} /> DISCREDIT_CHUNK
                        </button>
                     </div>
                   </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-criterion opacity-20 text-[9px]">RESEARCHER_INQUIRY</div>
                    <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem] rounded-tr-none text-white text-xl font-serif italic shadow-inner">
                        {m.text}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isSending && messages[messages.length-1]?.text === "" && (
            <div className="flex justify-start">
              <div className="text-criterion opacity-20 animate-pulse">SYNCHRONIZING_COLLECTIVE_ARCHIVE...</div>
            </div>
          )}
          <div ref={scrollEndRef} />
        </div>

        {/* Clinical Input bar */}
        <div className="p-10 border-t border-white/5">
           <div className="relative flex items-center">
              <input 
                type="text"
                placeholder="SUBMIT_NARRATIVE_QUERY..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="w-full bg-transparent border-b border-white/10 py-6 pr-32 text-2xl font-serif italic text-white outline-none focus:border-white transition-all tracking-tight"
              />
              <button 
                disabled={isSending || !inputMessage.trim()}
                onClick={handleSendMessage}
                className="absolute right-0 bottom-6 text-criterion hover:text-white transition-colors flex items-center gap-3"
              >
                INITIATE <Zap size={14} fill="currentColor" />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
