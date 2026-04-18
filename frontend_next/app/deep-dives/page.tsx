"use client"

import { useState, useEffect } from "react"
import { 
  ExternalLink,
  Search,
  MessageSquare,
  Sparkles,
  Trash2
} from "lucide-react"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"

interface ChatSession {
  thread_id: string;
  movie_title: string;
  last_message: string;
  updated_at: string;
  movie_id: number;
}

export default function DeepDivesIndex() {
  const { user, isLoaded } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    const fetchSessions = async () => {
      try {
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
        // Fetch all chat history, grouped by thread_id
        const userParam = user ? `?clerk_id=${user.id}` : "";
        const response = await fetch(`${primaryApiUrl}/history/thread/all${userParam}`);
        
        if (response.ok) {
          const data = await response.json();
          // Transform raw chat history into session summaries
          if (Array.isArray(data) && data.length > 0) {
            const threadMap = new Map<string, ChatSession>();
            for (const msg of data) {
              if (!threadMap.has(msg.thread_id)) {
                threadMap.set(msg.thread_id, {
                  thread_id: msg.thread_id,
                  movie_title: `Movie #${msg.movie_id}`,
                  last_message: msg.message,
                  updated_at: new Date(msg.created_at).toLocaleString(),
                  movie_id: msg.tmdb_id || msg.movie_id
                });
              } else {
                // Update last message
                const existing = threadMap.get(msg.thread_id)!;
                existing.last_message = msg.message;
                existing.updated_at = new Date(msg.created_at).toLocaleString();
              }
            }
            const sessionList = Array.from(threadMap.values());
            
            // Enrich titles with TMDB
            const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
            const enriched = await Promise.all(
              sessionList.map(async (session) => {
                try {
                  const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${session.movie_id}?api_key=${TMDB_API_KEY}`);
                   if (tmdbRes.ok) {
                     const tmdbData = await tmdbRes.json();
                     if (tmdbData.title) {
                        return { ...session, movie_title: tmdbData.title };
                     }
                   }
                 } catch {}
                 return session;
              })
            );
            setSessions(enriched);
          }
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [isLoaded, user?.id]);

  return (
    <div className="cinematic-canvas p-20 selection:bg-white selection:text-black">
      <div className="film-grain" />
      
      <div className="max-w-6xl mx-auto space-y-24 relative z-10">
        
        <header className="flex items-end justify-between border-b border-white/10 pb-16">
          <div className="space-y-6">
             <div className="text-criterion opacity-30">Researcher / Persistent_Sessions</div>
             <h1 className="text-8xl font-black italic tracking-tighter leading-none text-white uppercase">Deep Dive Library</h1>
             <p className="text-2xl text-slate-500 font-serif italic max-w-xl">Recall previous RAG conversations and philosophical analyses across the cinematic archive.</p>
          </div>
        </header>

        <div className="space-y-4">
           <div className="grid grid-cols-12 gap-8 px-12 py-4 text-criterion opacity-20 text-[9px] border-b border-white/5">
              <div className="col-span-8">ARCHIVE PATH / NARRATIVE_CONTEXT</div>
              <div className="col-span-2">SYNCHRONIZATION</div>
              <div className="col-span-2 text-right">SYSTEM_ACTION</div>
           </div>

           {loading ? (
              <div className="py-20 text-center text-criterion opacity-20 animate-pulse">SYNCHRONIZING_SESSION_INDEX...</div>
           ) : sessions.length === 0 ? (
              <div className="py-40 text-center space-y-8">
                 <Sparkles size={48} className="mx-auto text-white/10" />
                 <div className="space-y-2">
                    <h3 className="text-4xl font-black italic tracking-tighter text-white">NO SESSIONS IN ARCHIVE</h3>
                    <p className="text-slate-600 font-serif italic text-xl">Search a film and activate the Deep Dive tool to begin your first narrative analysis.</p>
                 </div>
                 <Link href="/" className="inline-block pt-8">
                    <div className="text-criterion border-b border-white hover:opacity-50 transition-opacity pb-2">BACK_TO_ARCHIVE_SEARCH</div>
                 </Link>
              </div>
           ) : (
              <div className="divide-y divide-white/[0.03]">
                 {sessions.map((session) => (
                   <div 
                     key={session.thread_id} 
                     className="grid grid-cols-12 gap-8 px-12 py-12 group hover:bg-white/[0.01] transition-all items-center rounded-2xl"
                   >
                      <div className="col-span-8 flex items-start gap-8">
                          <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                             <MessageSquare size={24} strokeWidth={1} />
                          </div>
                          <div className="space-y-4 flex-1">
                             <div className="space-y-1">
                               <div className="text-criterion opacity-30">UUID: {session.thread_id.substring(0,8)}...</div>
                               <h2 className="text-5xl font-black italic tracking-tighter text-white uppercase leading-none">{session.movie_title}</h2>
                             </div>
                             <p className="text-slate-500 font-serif italic text-lg leading-relaxed line-clamp-1 max-w-2xl">
                                "{session.last_message}"
                             </p>
                          </div>
                      </div>

                      <div className="col-span-2">
                          <div className="text-white font-mono text-sm">{session.updated_at}</div>
                          <div className="text-criterion opacity-10 text-[9px]">LAST_DATA_SYNC</div>
                      </div>

                      <div className="col-span-2 text-right flex justify-end gap-10 opacity-20 group-hover:opacity-100 transition-opacity">
                          <Link href={`/deep-dive/${session.thread_id}`} className="hover:text-white transition-colors">
                             <ExternalLink size={20} strokeWidth={1.5} />
                          </Link>
                          <button className="hover:text-red-500 transition-colors">
                             <Trash2 size={20} strokeWidth={1.5} />
                          </button>
                      </div>
                   </div>
                 ))}
              </div>
           )}
        </div>
      </div>
    </div>
  )
}
