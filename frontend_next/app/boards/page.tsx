"use client"

import { useState, useEffect } from "react"
import { MessageSquare, ArrowRight, Search, PlusSquare } from "lucide-react"
import { useRouter } from "next/navigation"

interface BoardPreview {
  movie_id: number;
  movie_title: string;
  post_count: number;
}

export default function BoardsIndex() {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
        const res = await fetch(`${primaryApiUrl}/discussions/boards`);
        if (!res.ok) throw new Error("Failed to fetch boards");
        const data: BoardPreview[] = await res.json();
        
        // Enrich any placeholder titles ("Movie #12345") with real TMDB names
        const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        const enriched = await Promise.all(
          data.map(async (board) => {
            if (board.movie_title.startsWith("Movie #")) {
              try {
                const tmdbRes = await fetch(
                  `https://api.themoviedb.org/3/movie/${board.movie_id}?api_key=${TMDB_API_KEY}`
                );
                if (tmdbRes.ok) {
                  const tmdb = await tmdbRes.json();
                  const year = tmdb.release_date ? ` (${tmdb.release_date.split("-")[0]})` : "";
                  return { ...board, movie_title: `${tmdb.title}${year}` };
                }
              } catch {}
            }
            return board;
          })
        );
        setBoards(enriched);
      } catch (err) {
        console.error("Failed to fetch boards:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBoards();
  }, []);

  // TMDB search for creating new boards
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults((data.results || []).slice(0, 5));
      } catch {}
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const navigateToBoard = (movieId: number) => {
    router.push(`/movie/${movieId}/discussions`);
  };

  return (
    <div className="cinematic-canvas p-20 selection:bg-white selection:text-black">
      <div className="film-grain" />
      <div className="max-w-6xl mx-auto space-y-24 relative z-10">
        
        <header className="flex items-end justify-between border-b border-white/10 pb-16">
          <div className="space-y-6">
             <div className="text-criterion opacity-30">Archive_Unit / Narrative_Boards</div>
             <h1 className="text-8xl font-black italic tracking-tighter leading-none text-white drop-shadow-2xl">THE ARCHIVE BOARDS</h1>
             <p className="text-2xl text-slate-500 font-serif italic max-w-xl">Every film title is a persistent thread of discussion. Select a board to engage with the cinematic memory.</p>
          </div>
        </header>

        <div className="space-y-4">
           <div className="grid grid-cols-12 gap-8 px-8 py-3 text-criterion opacity-20 text-[9px] border-b border-white/5 uppercase">
              <div className="col-span-1">No.</div>
              <div className="col-span-7">Board / Subject Architecture</div>
              <div className="col-span-2">Density</div>
              <div className="col-span-2 text-right">Action</div>
           </div>

           {loading ? (
             <div className="py-20 text-center text-criterion opacity-20 animate-pulse">SYNCHRONIZING_BOARD_INDEX...</div>
           ) : boards.length === 0 ? (
             <div className="py-20 text-center space-y-6">
                <MessageSquare size={40} className="mx-auto text-white/10" />
                <div className="text-criterion opacity-20">NO_ACTIVE_BOARDS</div>
                <p className="text-slate-500 font-serif italic text-lg">No movies have active discussions yet. Create the first board below.</p>
             </div>
           ) : (
             <div className="divide-y divide-white/[0.03]">
                {boards.map((board, idx) => (
                  <div 
                    key={board.movie_id} 
                    onClick={() => navigateToBoard(board.movie_id)}
                    className="grid grid-cols-12 gap-8 px-8 py-10 group hover:bg-white/[0.01] transition-all items-center cursor-pointer"
                  >
                     <div className="col-span-1 text-criterion opacity-10 group-hover:opacity-100 transition-opacity">/{idx+1}/</div>
                     <div className="col-span-7 flex items-center gap-8">
                         <div className="w-12 h-16 bg-white/5 border border-white/5 flex items-center justify-center opacity-10 group-hover:opacity-100 transition-opacity">
                            <MessageSquare size={16} />
                         </div>
                         <div>
                            <div className="text-4xl font-bold italic tracking-tighter text-white group-hover:pl-4 transition-all duration-500 flex items-center gap-4">
                               {board.movie_title.toUpperCase()}
                               <ArrowRight size={24} className="opacity-0 group-hover:opacity-100 transition-all text-white/20" />
                            </div>
                            <div className="text-[10px] text-criterion opacity-20 group-hover:opacity-40 transition-opacity mt-2">BOARD_ID: {board.movie_id}</div>
                         </div>
                     </div>
                     <div className="col-span-2">
                         <div className="text-white font-mono text-lg">{board.post_count}</div>
                         <div className="text-[9px] text-criterion opacity-20">THREADS_ACTIVE</div>
                     </div>
                     <div className="col-span-2 text-right">
                         <div className="text-criterion opacity-0 group-hover:opacity-100 transition-opacity">[ ENTER ]</div>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* Generate New Archive Board */}
        <div 
          onClick={() => setShowSearch(!showSearch)}
          className="p-16 glass-surface rounded-[2rem] border border-white/5 cursor-pointer hover:border-white/20 transition-all mt-20"
        >
           <div className="flex items-center justify-between">
             <div className="space-y-4">
                <div className="text-criterion opacity-40">System_Wide_Collective</div>
                <h3 className="text-5xl font-black italic tracking-tighter text-white">
                  {showSearch ? "SEARCH FILM ARCHIVES" : "GENERATE NEW ARCHIVE BOARD"}
                </h3>
                <p className="text-slate-500 font-serif italic text-lg">
                  {showSearch ? "Type a movie title to initiate a new discussion board." : "Can't find a film? Search the archives to create a new board."}
                </p>
             </div>
             <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all">
                {showSearch ? <Search size={32} /> : <PlusSquare size={32} />}
             </div>
           </div>
           {showSearch && (
             <div className="mt-12 space-y-6" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="text"
                  placeholder="SEARCH_TMDB_ARCHIVES..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/10 py-6 text-2xl font-serif italic text-white placeholder:text-slate-700 outline-none focus:border-white transition-all"
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => navigateToBoard(movie.id)}
                        className="w-full flex items-center justify-between p-6 rounded-xl hover:bg-white/5 transition-all group"
                      >
                        <div className="text-left flex items-center gap-6">
                          {movie.poster_path && (
                            <img src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} alt="" className="w-12 h-16 object-cover rounded opacity-60 group-hover:opacity-100 transition-opacity" />
                          )}
                          <div>
                            <div className="text-white font-serif italic text-xl">{movie.title}</div>
                            <div className="text-criterion opacity-40 text-[10px]">
                              {movie.release_date ? new Date(movie.release_date).getFullYear() : '—'} / TMDB_ID: {movie.id}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 text-white transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  )
}
