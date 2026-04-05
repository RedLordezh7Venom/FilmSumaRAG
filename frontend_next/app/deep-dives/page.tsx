"use client"

import { useState, useEffect } from "react"
import { 
  MonitorPlay, 
  ArrowRight, 
  Clock, 
  Trash2, 
  ExternalLink,
  Search,
  MessageSquare,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

interface ChatSession {
  thread_id: string;
  movie_title: string;
  last_message: string;
  updated_at: string;
  movie_id: number;
}

export default function DeepDivesIndex() {
  const [sessions, setSessions] = useState<ChatSession[]>([
    { 
      thread_id: "550e8400-e29b-41d4-a716-446655440000", 
      movie_title: "Blade Runner 2049", 
      last_message: "The concept of baseline tests represents...", 
      updated_at: "10m ago",
      movie_id: 335984
    },
    { 
      thread_id: "72924172-45d2-4e0d-8730-d6790aa8d506", 
      movie_title: "2001: A Space Odyssey", 
      last_message: "The monolith acts as a catalyst for...", 
      updated_at: "2h ago",
      movie_id: 62
    }
  ]);

  return (
    <div className="cinematic-canvas p-20 selection:bg-white selection:text-black">
      <div className="film-grain" />
      
      <div className="max-w-6xl mx-auto space-y-24 relative z-10">
        
        {/* Cinematic Header */}
        <header className="flex items-end justify-between border-b border-white/10 pb-16">
          <div className="space-y-6">
             <div className="text-criterion opacity-30">Researcher / Persistent_Sessions</div>
             <h1 className="text-8xl font-black italic tracking-tighter leading-none text-white drop-shadow-2xl uppercase">Deep Dive Library</h1>
             <p className="text-2xl text-slate-500 font-serif italic max-w-xl">Recall previous RAG conversations and philosophical analyses across the cinematic archive.</p>
          </div>
          <div className="flex gap-12 text-criterion">
             <div className="flex items-center gap-3 opacity-20"><Search size={14} /> FILTER_SESSIONS</div>
          </div>
        </header>

        {/* Sessions Index Ledger */}
        <div className="space-y-4">
           <div className="grid grid-cols-12 gap-8 px-12 py-4 text-criterion opacity-20 text-[9px] border-b border-white/5">
              <div className="col-span-8">ARCHIVE PATH / NARRATIVE_CONTEXT</div>
              <div className="col-span-2">SYNCHRONIZATION</div>
              <div className="col-span-2 text-right">SYSTEM_ACTION</div>
           </div>

           <div className="divide-y divide-white/[0.03]">
              {sessions.map((session) => (
                <div 
                  key={session.thread_id} 
                  className="grid grid-cols-12 gap-8 px-12 py-12 group hover:bg-white/[0.01] transition-all items-center rounded-2xl"
                >
                   {/* Context & Snippet */}
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

                   {/* Last Pulse */}
                   <div className="col-span-2">
                       <div className="text-white font-mono text-sm uppercase">{session.updated_at}</div>
                       <div className="text-criterion opacity-10 text-[9px]">LAST_DATA_SYNC</div>
                   </div>

                   {/* Actions */}
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
        </div>

        {/* Empty State / Initiate CTA */}
        {sessions.length === 0 && (
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
        )}

      </div>
    </div>
  )
}
