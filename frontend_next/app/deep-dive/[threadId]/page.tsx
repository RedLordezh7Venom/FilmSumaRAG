"use client"

import { useState, useEffect, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ThumbsUp, ThumbsDown, Zap } from 'lucide-react';
import { Typewriter } from "@/components/effects/typewriter";
import Link from 'next/link';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  feedback?: 'up' | 'down';
  citations?: string[];
}

export default function DeepDiveChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  const unwrappedParams = use(params);
  const threadId = unwrappedParams.threadId;
  const searchParams = useSearchParams();
  const movieId = searchParams.get('movie');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [movieTitles, setMovieTitles] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareSearch, setCompareSearch] = useState("");
  const [compareResults, setCompareResults] = useState<any[]>([]);
  const [persona, setPersona] = useState<"critic" | "philosopher" | "scene_creator">("critic");
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Fetch movie title from TMDB on load
  useEffect(() => {
    const fetchMovieTitle = async () => {
      if (!movieId) return;
      try {
        const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`);
        const data = await res.json();
        if (data.title) {
          const year = data.release_date ? ` (${data.release_date.split('-')[0]})` : '';
          setMovieTitles([`${data.title}${year}`]);
        }
      } catch (err) {
        console.error("Failed to fetch movie title:", err);
      }
    };
    fetchMovieTitle();
  }, [movieId]);

  // TMDB Comparison Search
  useEffect(() => {
    if (compareSearch.trim().length < 3) {
      setCompareResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(compareSearch)}`);
        const data = await res.json();
        setCompareResults(data.results?.slice(0, 4) || []);
      } catch (err) {}
    }, 500);
    return () => clearTimeout(timer);
  }, [compareSearch]);

  const addMovieToCompare = (title: string, date: string) => {
    const year = date ? ` (${date.split('-')[0]})` : '';
    setMovieTitles(prev => [...prev, `${title}${year}`]);
    setIsComparing(false);
    setCompareSearch("");
  };

  // Load existing thread history from backend
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
        const res = await fetch(`${primaryApiUrl}/history/chat-history/thread/${threadId}`);
        if (res.ok) {
          const history = await res.json();
          if (Array.isArray(history) && history.length > 0) {
            const restored: Message[] = history.map((h: any, i: number) => ({
              id: h.id || i,
              text: h.message,
              sender: h.role === 'user' ? 'user' as const : 'ai' as const,
              citations: h.citations ? JSON.parse(h.citations) : undefined
            }));
            setMessages(restored);

            // If we didn't have a movieId from URL, grab it from history to fetch title
            if (!movieId && history[0].movie_id) {
              const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
              fetch(`https://api.themoviedb.org/3/movie/${history[0].movie_id}?api_key=${TMDB_API_KEY}`)
                .then(r => r.json())
                .then(data => {
                  if (data.title) {
                    const year = data.release_date ? ` (${data.release_date.split('-')[0]})` : '';
                    setMovieTitles([`${data.title}${year}`]);
                  }
                }).catch(() => {});
            }
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load thread history:", err);
      }
      // Default greeting if no history exists
      setMessages([
        { id: 0, text: `SESSION_INITIALIZED. [THREAD: ${threadId.substring(0,8)}] READY_FOR_INQUIRY.`, sender: 'ai' }
      ]);
    };
    loadHistory();
  }, [threadId]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleFeedback = async (msgId: number, type: 'up' | 'down') => {
    // Optimistic UI update only — backend feedback requires clerk_id which
    // may not be available for anonymous users. Silently skip the API call
    // if it fails, but always update the UI.
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: type } : m));
    try {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
      const res = await fetch(`${primaryApiUrl}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerk_id: "anonymous",
          movie_title: movieTitles.join(" vs "),
          chat_id: msgId,
          rating: type === 'up' ? 1 : 0,
          downvote: type === 'down',
          persona: persona
        })
      });
      if (!res.ok) {
        console.warn("Feedback not saved (user may not be logged in)");
      }
    } catch (err) {
      console.warn("Feedback endpoint unavailable:", err);
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
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
      const response = await fetch(`${primaryApiUrl}/deep_dive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movie: movieTitles,
          question: userText,
          thread_id: threadId,
          persona: persona
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

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
              if (data.type === "citations") {
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMsgId ? { ...msg, citations: data.ids } : msg
                ));
              } else if (data.token) {
                fullText += data.token;
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMsgId ? { ...msg, text: fullText } : msg
                ));
              }
            } catch (e) { /* partial SSE line */ }
          }
        }
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, text: `ERROR: ${err.message || 'CONNECTION_INTERRUPTED'}` } : msg
      ));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] flex flex-col items-center py-20 px-8 font-sans selection:bg-white selection:text-black">
      <div className="film-grain" />
      
      <div className="max-w-5xl w-full flex flex-col h-[80vh] glass-surface rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/5">
        
        <header className="p-10 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
             <Link href={movieId ? `/movie/${movieId}` : '/'} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
                <ArrowLeft size={20} />
             </Link>
             <div className="relative">
                <div className="text-criterion opacity-30 flex items-center gap-3">
                   Archive_Analysis / {movieTitles.join(' vs ')}
                   <button 
                     onClick={() => setIsComparing(!isComparing)}
                     className="hover:text-white px-2 py-1 rounded border border-white/10 text-[8px] transition-colors"
                   >
                     + COMPARE
                   </button>
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase mt-1">Deep Dive Session</h2>
                
                {isComparing && (
                   <div className="absolute top-full left-0 mt-2 p-4 w-96 glass-surface rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 border border-white/10 bg-[#0b0f17]/90 backdrop-blur-xl">
                      <input 
                        type="text" 
                        placeholder="Search TMDB for comparison..."
                        value={compareSearch}
                        onChange={e => setCompareSearch(e.target.value)}
                        className="w-full bg-transparent border-b border-white/10 py-2 text-white font-serif outline-none focus:border-white transition-all text-sm mb-4"
                      />
                      <div className="space-y-2">
                         {compareResults.map(m => (
                            <div 
                              key={m.id} 
                              onClick={() => addMovieToCompare(m.title, m.release_date)}
                              className="font-sans text-xs text-slate-300 hover:text-white cursor-pointer px-2 py-2 hover:bg-white/5 rounded transition-all"
                            >
                               {m.title} {m.release_date ? `(${m.release_date.split('-')[0]})` : ''}
                            </div>
                         ))}
                      </div>
                   </div>
                )}
             </div>
          </div>
          <div className="text-right flex flex-col items-end gap-3">
             <div className="flex items-center gap-3 border border-white/5 rounded-full px-4 py-2 bg-white/[0.02]">
                <span className="text-criterion opacity-50 text-[9px]">PERSONA</span>
                <select 
                  value={persona}
                  onChange={(e) => setPersona(e.target.value as any)}
                  className="bg-transparent text-white font-serif italic text-sm outline-none cursor-pointer appearance-none text-right hover:text-slate-300 transition-colors [&>option]:bg-[#0b0f17] [&>option]:font-sans [&>option]:not-italic [&>option]:text-xs"
                >
                  <option value="critic">The Critic</option>
                  <option value="philosopher">The Philosopher</option>
                  <option value="scene_creator">Scene Creator</option>
                </select>
             </div>
             <div className="flex items-center gap-3">
               <div className="text-criterion opacity-30 text-[9px]">THREAD_ID</div>
               <div className="text-white font-mono text-[10px] font-bold opacity-50">{threadId.substring(0,18)}...</div>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 space-y-16 custom-scrollbar no-scrollbar">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] space-y-4 ${m.sender === 'user' ? 'text-right' : 'text-left'}`}>
                
                {m.sender === 'ai' ? (
                   <div className="space-y-6 group">
                     <div className="text-criterion opacity-20 text-[9px]">CRITIC_RESPONSE</div>
                     <div className="text-white font-serif italic text-2xl leading-relaxed">
                        {m.text ? <Typewriter text={m.text} speed={8} key={`${m.id}-${m.text.length}`} delay={0} /> : <span className="animate-pulse text-criterion opacity-30">ANALYZING...</span>}
                        {m.citations && m.citations.length > 0 && m.text && (
                           <sup className="ml-3 group/cit relative inline-block cursor-help">
                              <span className="text-[9px] font-sans font-bold not-italic tracking-widest uppercase text-criterion border border-white/20 rounded px-2 py-0.5 group-hover/cit:bg-white group-hover/cit:text-black transition-colors">
                                [{m.citations.length} SOURCES]
                              </span>
                              <div className="absolute hidden group-hover/cit:block bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 p-4 bg-[#0b0f17] border border-white/10 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] text-slate-300 font-sans text-xs not-italic z-50">
                                 <div className="text-white font-bold mb-2 uppercase opacity-50 tracking-widest text-[9px]">Archival Chunks</div>
                                 <div className="space-y-1 block max-h-32 overflow-y-auto no-scrollbar">
                                   {m.citations.map(c => (
                                      <div key={c} className="truncate select-all font-mono opacity-80">{c}</div>
                                   ))}
                                 </div>
                              </div>
                           </sup>
                        )}
                     </div>
                     
                     {m.text && (
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
                     )}
                   </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-criterion opacity-20 text-[9px]">RESEARCHER_INQUIRY</div>
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] rounded-tr-none text-white text-xl font-serif italic shadow-2xl">
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

        <div className="p-10 border-t border-white/5 bg-[#0b0f17]/50 backdrop-blur-md">
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
                className="absolute right-0 bottom-6 text-criterion hover:text-white disabled:opacity-10 transition-all flex items-center gap-3"
              >
                INITIATE <Zap size={14} fill="currentColor" />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
