"use client"

import { useState, useEffect, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ThumbsUp, ThumbsDown, Zap, ExternalLink, X } from 'lucide-react';
import Link from 'next/link';

// Reveals completed text fast (4ms/char) — stable key = never restarts on re-render
function SlowReveal({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (displayed >= text.length) return;
    const t = setTimeout(() => setDisplayed(d => d + 1), 4);
    return () => clearTimeout(t);
  }, [displayed, text.length]);

  return (
    <span className="text-white font-serif italic text-2xl leading-relaxed whitespace-pre-wrap">
      {text.slice(0, displayed)}
      {displayed < text.length && (
        <span className="inline-block w-0.5 h-5 bg-white/50 ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}


interface Source {
  id: string;
  text: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  feedback?: 'up' | 'down';
  citations?: Source[];
}

interface MovieIdentity {
  id: number;
  title: string;
}

export default function DeepDiveChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  const unwrappedParams = use(params);
  const threadId = unwrappedParams.threadId;
  const searchParams = useSearchParams();
  const movieIdStr = searchParams.get('movie');
  const movieId = movieIdStr ? parseInt(movieIdStr) : null;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [movieList, setMovieList] = useState<MovieIdentity[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareSearch, setCompareSearch] = useState("");
  const [compareResults, setCompareResults] = useState<any[]>([]);
  const [persona, setPersona] = useState<"critic" | "philosopher" | "scene_creator">("critic");
  const [feedbackDraft, setFeedbackDraft] = useState<{msgId: number, type: 'up' | 'down', comment: string} | null>(null);
  const [activeSource, setActiveSource] = useState<{msgId: number, sourceIdx: number} | null>(null);
  const [streamingMsgId, setStreamingMsgId] = useState<number | null>(null);
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
          setMovieList([{id: movieId, title: `${data.title}${year}`}]);
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
        setCompareResults(data.results?.slice(0, 5) || []);
      } catch (err) {}
    }, 500);
    return () => clearTimeout(timer);
  }, [compareSearch]);

  const addMovieToCompare = (id: number, title: string, date: string) => {
    const year = date ? ` (${date.split('-')[0]})` : '';
    if (movieList.some(m => m.id === id)) return;
    setMovieList(prev => [...prev, { id, title: `${title}${year}` }]);
    setIsComparing(false);
    setCompareSearch("");
  };

  // Load existing thread history from backend
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
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

            if (!movieId && history[0].movie_id) {
              const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
              fetch(`https://api.themoviedb.org/3/movie/${history[0].movie_id}?api_key=${TMDB_API_KEY}`)
                .then(r => r.json())
                .then(data => {
                  if (data.title) {
                    const year = data.release_date ? ` (${data.release_date.split('-')[0]})` : '';
                    setMovieList([{ id: history[0].movie_id, title: `${data.title}${year}` }]);
                  }
                }).catch(() => {});
            }
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load thread history:", err);
      }
      setMessages([
        { id: 0, text: `SESSION_INITIALIZED. [THREAD: ${threadId.substring(0, 8)}] READY_FOR_INQUIRY.`, sender: 'ai' }
      ]);
    };
    loadHistory();
  }, [threadId]);

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
    setStreamingMsgId(aiMsgId);

    try {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${primaryApiUrl}/deep_dive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movie: movieList.length > 0 ? movieList.map(m => m.title) : ["Unknown Film"],
          tmdb_ids: movieList.map(m => m.id),
          question: userText,
          thread_id: threadId,
          persona: persona
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === "citations") {
                setMessages(prev => prev.map(msg =>
                  msg.id === aiMsgId ? { ...msg, citations: data.sources } : msg
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
      setStreamingMsgId(null);
    }
  };

  const handleFeedbackClick = (msgId: number, type: 'up' | 'down') => {
    if (type === 'down') {
      setFeedbackDraft({ msgId, type: 'down', comment: '' });
    } else {
      submitFeedback(msgId, 'up', '');
    }
  };

  const submitFeedback = async (msgId: number, type: 'up' | 'down', comment: string = '') => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, feedback: type } : m));
    if (type === 'down') setFeedbackDraft(null);
    try {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
      await fetch(`${primaryApiUrl}/feedback/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerk_id: "guest", // TODO: wire Clerk user.id here
          tmdb_id: movieList[0]?.id || 0,
          upvote: type === 'up',
          context: "deep_dive",
          chat_id: msgId,
          comment: comment || null,
        })
      });
    } catch (err) {
      console.warn("Feedback endpoint unavailable:", err);
    }
  };

  const personaLabel = persona === 'critic' ? 'CRITIC' : persona === 'philosopher' ? 'PHILOSOPHER' : 'SCENE_CREATOR';

  return (
    <div className="min-h-screen bg-[#0b0f17] flex flex-col items-center py-20 px-8 font-sans selection:bg-white selection:text-black">
      <div className="film-grain" />

      <div className="max-w-5xl w-full flex flex-col h-[80vh] glass-surface rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/5">

        {/* Header */}
        <header className="p-10 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={movieId ? `/movie/${movieId}` : '/'} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
              <ArrowLeft size={20} />
            </Link>
            <div className="relative">
              <div className="text-criterion opacity-30 flex items-center gap-3 text-[9px]">
                Archive_Analysis / {movieList.map(m => m.title).join(' vs ') || 'Loading...'}
                <button
                  onClick={() => setIsComparing(!isComparing)}
                  className="hover:text-white px-2 py-1 rounded border border-white/10 transition-colors"
                >
                  + COMPARE
                </button>
              </div>
              <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase mt-1">Deep Dive Session</h2>

              {/* Compare Dropdown */}
              {isComparing && (
                <div className="absolute top-full left-0 mt-2 p-4 w-96 glass-surface rounded-2xl shadow-2xl z-50 border border-white/10 bg-[#0b0f17]/95 backdrop-blur-xl">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search TMDB for comparison..."
                    value={compareSearch}
                    onChange={e => setCompareSearch(e.target.value)}
                    className="w-full bg-transparent border-b border-white/10 py-2 text-white font-serif italic outline-none focus:border-white transition-all text-sm mb-4"
                  />
                  <div className="space-y-1">
                    {compareResults.map(m => (
                      <div
                        key={m.id}
                        onClick={() => addMovieToCompare(m.id, m.title, m.release_date)}
                        className="font-sans text-xs text-slate-300 hover:text-white cursor-pointer px-3 py-2 hover:bg-white/5 rounded-lg transition-all flex items-center gap-3"
                      >
                        {m.poster_path && (
                          <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} className="w-6 h-9 object-cover rounded opacity-60" alt="" />
                        )}
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
              <div className="text-white font-mono text-[10px] font-bold opacity-50">{threadId.substring(0, 18)}...</div>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-12 space-y-16 no-scrollbar">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] space-y-4 ${m.sender === 'user' ? 'text-right' : 'text-left'}`}>

                {m.sender === 'ai' ? (
                  <div className="space-y-6 group">
                    <div className="text-criterion opacity-20 text-[9px]">{personaLabel}_RESPONSE</div>
                    <div className="text-white font-serif italic text-2xl leading-relaxed">
                      {m.text
                        ? streamingMsgId === m.id
                          ? <span className="text-white font-serif italic text-2xl leading-relaxed whitespace-pre-wrap">{m.text}</span>
                          : <SlowReveal key={m.id} text={m.text} />
                        : <span className="animate-pulse text-criterion opacity-30">ANALYZING...</span>
                      }
                    </div>

                    {/* Rich Citations */}
                    {m.citations && m.citations.length > 0 && m.text && (
                       <div className="flex flex-wrap gap-3 pt-2">
                          <div className="text-criterion opacity-20 text-[9px] w-full mb-1 uppercase tracking-widest">Supporting Archive Fragments:</div>
                          {m.citations.map((cite, idx) => {
                             const isPinned = activeSource?.msgId === m.id && activeSource?.sourceIdx === idx;
                             
                             return (
                                <div key={idx} className="group/cite relative">
                                   <button 
                                      onClick={() => setActiveSource(isPinned ? null : { msgId: m.id, sourceIdx: idx })}
                                      className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${isPinned ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-white/5 bg-white/[0.02] hover:bg-white/10 hover:border-white/20 text-criterion'}`}
                                   >
                                      <Zap size={10} className={isPinned ? 'fill-current' : 'opacity-40'} />
                                      <span className="text-[10px] font-bold tracking-widest uppercase">FRAGMENT_{idx + 1}</span>
                                   </button>
                                   
                                   {/* Hover/Pinned Preview */}
                                   <div className={`absolute bottom-full left-0 mb-4 w-96 p-6 bg-[#161b22] border-2 border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-300 z-50 transform 
                                      ${isPinned ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-1 scale-95 pointer-events-none group-hover/cite:opacity-100 group-hover/cite:translate-y-0 group-hover/cite:scale-100'}`}
                                   >
                                      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                         <div className="text-[10px] text-criterion font-black tracking-[0.2em] uppercase">Fragment Context</div>
                                         <button onClick={(e) => { e.stopPropagation(); setActiveSource(null); }} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                                            <X size={14} className="text-white/40" />
                                         </button>
                                      </div>
                                      <div className="text-white font-serif italic text-base leading-relaxed max-h-60 overflow-y-auto pr-4 custom-scrollbar">
                                         <span className="text-indigo-400 text-2xl leading-none mr-2 font-serif opacity-50">"</span>
                                         {cite.text.split('] ').pop()}
                                         <span className="text-indigo-400 text-2xl leading-none ml-1 font-serif opacity-50">"</span>
                                      </div>
                                      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                         <div className="flex gap-4">
                                            <div className="flex flex-col">
                                               <span className="text-[8px] text-white/20 uppercase tracking-tighter">Reliability</span>
                                               <span className="text-[10px] text-green-500 font-bold">VERIFIED</span>
                                            </div>
                                            <div className="flex flex-col">
                                               <span className="text-[8px] text-white/20 uppercase tracking-tighter">Source</span>
                                               <span className="text-[10px] text-indigo-400 font-bold">TRANSCRIPT</span>
                                            </div>
                                         </div>
                                         <div className="w-12 h-1 bg-white/5 rounded-full relative overflow-hidden">
                                            <div className="absolute inset-0 bg-indigo-500 w-3/4 animate-pulse"></div>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                    )}

                    {m.text && (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleFeedbackClick(m.id, 'up')}
                            className={`flex items-center gap-2 text-[9px] text-criterion transition-colors ${m.feedback === 'up' ? 'text-white' : 'opacity-20 hover:opacity-100'}`}
                          >
                            <ThumbsUp size={12} /> VALIDATE_CONTEXT
                          </button>
                          <button
                            onClick={() => handleFeedbackClick(m.id, 'down')}
                            className={`flex items-center gap-2 text-[9px] text-criterion transition-colors ${m.feedback === 'down' ? 'text-red-500' : 'opacity-20 hover:opacity-100'}`}
                          >
                            <ThumbsDown size={12} /> DISCREDIT_CHUNK
                          </button>
                        </div>

                        {feedbackDraft?.msgId === m.id && (
                          <div className="p-5 border border-red-500/20 bg-red-500/5 rounded-2xl space-y-4">
                            <div className="text-[9px] text-red-500/50 uppercase font-black tracking-widest font-sans">Discredit Rationale</div>
                            <textarea
                              value={feedbackDraft.comment}
                              onChange={e => setFeedbackDraft({ ...feedbackDraft, comment: e.target.value })}
                              placeholder="Specify inaccuracies to penalize archive chunk..."
                              className="w-full bg-transparent border-b border-red-500/20 text-white font-serif italic text-lg outline-none resize-none focus:border-red-500/50 transition-colors py-2 no-scrollbar"
                              rows={2}
                            />
                            <div className="flex justify-end gap-6 pt-2">
                              <button onClick={() => setFeedbackDraft(null)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Abort</button>
                              <button onClick={() => submitFeedback(m.id, 'down', feedbackDraft.comment)} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors">Submit Penalty</button>
                            </div>
                          </div>
                        )}
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
          {isSending && messages[messages.length - 1]?.text === "" && (
            <div className="flex justify-start">
              <div className="text-criterion opacity-20 animate-pulse">SYNCHRONIZING_COLLECTIVE_ARCHIVE...</div>
            </div>
          )}
          <div ref={scrollEndRef} />
        </div>

        {/* Input */}
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
