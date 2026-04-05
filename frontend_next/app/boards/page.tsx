"use client"

import { useState, useEffect } from "react"
import { MessageSquare, ArrowRight, CornerDownRight, Filter, PlusSquare, Search } from "lucide-react"
import Link from "next/link"

interface DiscussionPreview {
  movie_id: number;
  movie_title: string;
  post_count: number;
  last_activity: string;
  thumbnail: string;
}

export default function BoardsIndex() {
  const [boards, setBoards] = useState<DiscussionPreview[]>([
    { movie_id: 1327819, movie_title: "Active Narrative", post_count: 42, last_activity: "2m ago", thumbnail: "https://image.tmdb.org/t/p/w200/your_poster_path" },
    { movie_id: 1, movie_title: "Global Discussion", post_count: 1254, last_activity: "12s ago", thumbnail: "" }
  ]);

  return (
    <div className="cinematic-canvas p-20 selection:bg-white selection:text-black">
      <div className="film-grain" />
      
      <div className="max-w-6xl mx-auto space-y-24 relative z-10">
        
        {/* Header Ledger */}
        <header className="flex items-end justify-between border-b border-white/10 pb-16">
          <div className="space-y-6">
             <div className="text-criterion opacity-30">Archive_Unit / Narrative_Boards</div>
             <h1 className="text-8xl font-black italic tracking-tighter leading-none text-white drop-shadow-2xl">THE ARCHIVE BOARDS</h1>
             <p className="text-2xl text-slate-500 font-serif italic max-w-xl">Every film title is a persistent thread of discussion. Select a board to engage with the cinematic memory.</p>
          </div>
          <div className="flex gap-12 text-criterion">
             <button className="hover:text-white transition-opacity flex items-center gap-3">
                <Search size={14} strokeWidth={3} /> Search_Board
             </button>
             <button className="hover:text-white transition-opacity flex items-center gap-3">
                <PlusSquare size={14} strokeWidth={3} /> Open_Index
             </button>
          </div>
        </header>

        {/* Board High-Density Index */}
        <div className="space-y-4">
           <div className="grid grid-cols-12 gap-8 px-8 py-3 text-criterion opacity-20 text-[9px] border-b border-white/5 uppercase">
              <div className="col-span-1">No.</div>
              <div className="col-span-7">Board / Subject Architecture</div>
              <div className="col-span-2">Density</div>
              <div className="col-span-2 text-right">Synchronization</div>
           </div>

           <div className="divide-y divide-white/[0.03]">
              {boards.map((board, idx) => (
                <Link 
                  key={board.movie_id} 
                  href={`/movie/${board.movie_id}/discussions`}
                  className="grid grid-cols-12 gap-8 px-8 py-10 group hover:bg-white/[0.01] transition-all items-center"
                >
                   <div className="col-span-1 text-criterion opacity-10 group-hover:opacity-100 transition-opacity">/{idx+1}/</div>
                   <div className="col-span-7 flex items-center gap-8">
                       {board.thumbnail ? (
                         <img src={board.thumbnail} className="w-12 h-16 object-cover grayscale opacity-30 group-hover:opacity-100 transition-all rounded" alt="" />
                       ) : (
                         <div className="w-12 h-16 bg-white/5 border border-white/5 flex items-center justify-center opacity-10">
                            <MessageSquare size={16} />
                         </div>
                       )}
                       <div>
                          <div className="text-4xl font-bold italic tracking-tighter text-white group-hover:pl-4 transition-all duration-500 flex items-center gap-4">
                             {board.movie_title.toUpperCase()}
                             <ArrowRight size={24} className="opacity-0 group-hover:opacity-100 transition-all text-white/20" />
                          </div>
                          <div className="text-[10px] text-criterion opacity-20 group-hover:opacity-40 transition-opacity mt-2">NARRATIVE_STREAM_PATH: {board.movie_id}</div>
                       </div>
                   </div>
                   <div className="col-span-2">
                       <div className="text-white font-mono text-lg">{board.post_count}</div>
                       <div className="text-[9px] text-criterion opacity-20">THREADS_ACTIVE</div>
                   </div>
                   <div className="col-span-2 text-right">
                       <div className="text-white font-mono text-sm uppercase">{board.last_activity}</div>
                       <div className="text-[9px] text-criterion opacity-20">SYSTEM_LAST_PULSE</div>
                   </div>
                </Link>
              ))}
           </div>
        </div>

        {/* Global Discussion Board CTA */}
        <div className="p-16 glass-surface rounded-[2rem] border border-white/5 flex items-center justify-between group cursor-pointer hover:border-white/20 transition-all mt-20">
           <div className="space-y-4">
              <div className="text-criterion opacity-40">System_Wide_Collective</div>
              <h3 className="text-5xl font-black italic tracking-tighter text-white">GENERATE NEW ARCHIVE BOARD</h3>
              <p className="text-slate-500 font-serif italic text-lg">Can't find a film? Initiate a new board architecture through the search archives.</p>
           </div>
           <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
              <PlusSquare size={32} />
           </div>
        </div>

      </div>
    </div>
  )
}
