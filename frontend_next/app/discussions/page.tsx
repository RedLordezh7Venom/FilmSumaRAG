'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, Search, FileText, ChevronRight, User, Shield, Info } from 'lucide-react';
import Link from 'next/link';

interface Board {
  id: string;
  name: string;
  description: string;
  threads: number;
}

export default function DiscussionsFeedPage() {
  const [boards, setBoards] = useState<Board[]>([
    { id: '27205', name: 'inception', description: 'Dreams within dreams within boards.', threads: 142 },
    { id: '157336', name: 'interstellar', description: 'Tesseract construction and relativity discussions.', threads: 89 },
    { id: '414906', name: 'the_batman', description: 'Investigation of Gotham\'s finest cinematic detail.', threads: 56 },
    { id: '155', name: 'the_dark_knight', description: 'Agent of Chaos theory and philosophy.', threads: 210 },
  ]);

  return (
    <div className="min-h-screen bg-[#030712] text-[#d1d5db] font-mono p-8 pt-32 pb-20 selection:bg-slate-700 selection:text-white">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Board Header */}
        <header className="border-b-2 border-slate-900 pb-8 space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter text-white uppercase italic">
            /FILM/ - CINEMATIC_BOARDS
          </h1>
          <p className="text-xs text-slate-700 font-bold tracking-[0.2em]">Select a board to start deconstructing.</p>
        </header>

        {/* Board Catalog Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-900 border border-slate-900 shadow-2xl">
          {boards.map((board) => (
            <Link key={board.id} href={`/movie/${board.id}/discussions`}>
              <div className="bg-[#0b0f17] p-8 hover:bg-[#0d1117] transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <MessageSquare size={80} strokeWidth={1} />
                </div>
                
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-600 font-bold text-xl uppercase tracking-tighter">/{board.name}/</span>
                    <span className="text-[10px] text-slate-800 font-bold bg-slate-950 px-2 py-1 border border-slate-900 group-hover:border-slate-800 transition-colors">
                      {board.threads} ACTIVE THREADS
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {board.description}
                  </p>
                  
                  <div className="pt-4 flex items-center gap-2 text-[10px] font-bold text-slate-700 group-hover:text-slate-400 transition-colors">
                    [ OPEN BOARD ] <ChevronRight size={10} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Global Stats bar */}
        <div className="p-4 bg-[#0d1117] border border-slate-900 flex justify-between items-center text-[10px] font-bold text-slate-700">
          <div className="flex gap-6">
            <span className="flex items-center gap-2"><Shield size={10} /> SYSTEM: NOMINAL</span>
            <span className="flex items-center gap-2 text-emerald-600/50"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 1,402 USERS ONLINE</span>
          </div>
          <span>EST. 2026</span>
        </div>

        {/* Footer Navigation */}
        <footer className="pt-12 text-center">
          <Link href="/browse">
            <button className="text-[10px] text-slate-500 hover:text-white transition-colors uppercase tracking-[0.3em] font-bold">
              [ Back to Main Catalog ]
            </button>
          </Link>
        </footer>
      </div>
    </div>
  );
}
