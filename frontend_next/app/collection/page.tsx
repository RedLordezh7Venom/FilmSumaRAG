"use client"

import { useState, useEffect } from "react"
import { 
  Bookmark, FileText, MessageSquare, MonitorPlay, 
  ArrowRight, CheckCircle2, Circle, Search, LayoutGrid, List as ListIcon, BarChart,
  Download, CheckSquare, Square, Archive, Trash2, Loader2
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface CollectionMovie {
  id: number;
  title: string;
  status: string;
  created_at: string | null;
  has_summary: boolean;
  has_deep_dive: boolean;
  has_discussions: boolean;
  summary_count: number;
  deep_dive_threads: number;
  discussion_posts: number;
  // TMDB enrichment (client-side)
  tmdb_title?: string;
  tmdb_poster?: string;
  tmdb_year?: string;
  tmdb_rating?: number;
}

export default function CollectionPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<CollectionMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeFilter, setActiveFilter] = useState<"all" | "summary" | "chats" | "posts">("all");
  
  // Batch & Export State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
        const res = await fetch(`${primaryApiUrl}/movies/collection`);
        if (!res.ok) throw new Error("Failed to fetch collection");
        const data: CollectionMovie[] = await res.json();

        // Enrich with TMDB data (poster, real title, rating)
        const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        const enriched = await Promise.all(
          data.map(async (movie) => {
            try {
              const tmdbRes = await fetch(
                `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}`
              );
              if (tmdbRes.ok) {
                const tmdb = await tmdbRes.json();
                return {
                  ...movie,
                  tmdb_title: tmdb.title,
                  tmdb_poster: tmdb.poster_path,
                  tmdb_year: tmdb.release_date?.split("-")[0] || "—",
                  tmdb_rating: tmdb.vote_average,
                };
              }
            } catch {}
            return movie;
          })
        );

        // Sort: most activity first
        enriched.sort((a, b) => {
          const aScore = (a.has_summary ? 3 : 0) + (a.has_deep_dive ? 2 : 0) + (a.has_discussions ? 1 : 0);
          const bScore = (b.has_summary ? 3 : 0) + (b.has_deep_dive ? 2 : 0) + (b.has_discussions ? 1 : 0);
          return bScore - aScore;
        });

        setMovies(enriched);
      } catch (err) {
        console.error("Collection fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
  }, []);

  const toggleSelection = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleExportArchive = async () => {
    setIsExporting(true);
    // Mocking export generation delay
    await new Promise(r => setTimeout(r, 2000));
    const exportData = JSON.stringify(movies, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FilmSuma_Archive_Report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handleBatchRemove = () => {
    setMovies(prev => prev.filter(m => !selectedIds.has(m.id)));
    setSelectedIds(new Set());
  };

  const ActivityBadge = ({ active, label, count, icon: Icon, href }: { active: boolean; label: string; count?: number; icon: any; href?: string }) => {
    const badge = (
      <div className={`flex items-center gap-2 text-[10px] transition-all ${active ? (href ? 'text-white hover:text-emerald-400 group/badge' : 'text-white') : 'text-white/10'}`}>
        {active ? <CheckCircle2 size={12} className={href ? 'text-emerald-500 group-hover/badge:text-emerald-400 transition-colors' : 'text-emerald-500'} /> : <Circle size={12} />}
        <span className="text-criterion tracking-widest">{label} {count !== undefined && count > 0 && `(${count})`}</span>
      </div>
    );
    if (active && href) return <Link href={href} onClick={(e) => e.stopPropagation()}>{badge}</Link>;
    return badge;
  };

  const filteredMovies = movies.filter(m => {
    const matchesSearch = (m.tmdb_title || m.title).toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeFilter === "summary") return m.has_summary;
    if (activeFilter === "chats") return m.has_deep_dive;
    if (activeFilter === "posts") return m.has_discussions;
    
    return true;
  });

  return (
    <div className="cinematic-canvas p-20 selection:bg-white selection:text-black">
      <div className="film-grain" />

      <div className="max-w-6xl mx-auto space-y-24 relative z-10">

        {/* Header */}
        <header className="flex items-end justify-between border-b border-white/10 pb-16">
          <div className="space-y-6">
            <div className="text-criterion opacity-30">Archive_Unit / Personal_Collection</div>
            <h1 className="text-8xl font-black italic tracking-tighter leading-none text-white">MY COLLECTION</h1>
            <p className="text-2xl text-slate-500 font-serif italic max-w-xl">
              Every film you've touched leaves a trace. Summaries, deep dives, and discussions — all indexed here.
            </p>
          </div>
          <div className="text-right space-y-4 flex flex-col items-end">
            <div className="space-y-2">
               <div className="text-white font-mono text-4xl">{movies.length}</div>
               <div className="text-criterion opacity-30 text-[9px]">FILMS_IN_ARCHIVE</div>
            </div>
            
            <button 
               onClick={handleExportArchive}
               disabled={isExporting || movies.length === 0}
               className="flex items-center gap-2 px-4 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl transition-all font-bold tracking-widest text-[9px] uppercase disabled:opacity-50"
            >
               {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
               {isExporting ? "PACKAGING_REPORT..." : "EXPORT_ARCHIVE"}
            </button>
          </div>
        </header>

        {/* Toolbar: Search & View Toggle */}
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
          <div className="flex items-center gap-2 px-4 w-96 flex-1 max-w-sm">
            <Search size={16} className="text-white/20" />
            <input 
              type="text" 
              placeholder="Search your archive..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-white font-serif italic w-full placeholder:text-white/20"
            />
          </div>
          
          <div className="flex items-center gap-6 px-4">
             {/* Quick Filters */}
             <div className="flex items-center gap-2 text-[9px] font-bold tracking-widest border-l border-white/5 pl-6">
                <span className="text-criterion opacity-50 mr-2 uppercase">Filter:</span>
                {[
                  { id: "all", label: "Any" },
                  { id: "summary", label: "Summaries" },
                  { id: "chats", label: "Deep Dives" },
                  { id: "posts", label: "Discussions" }
                ].map(f => (
                  <button 
                     key={f.id}
                     onClick={() => setActiveFilter(f.id as any)}
                     className={`px-3 py-1 rounded-full transition-all border ${activeFilter === f.id ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'border-white/5 text-white/30 hover:border-white/20 hover:text-white'}`}
                  >
                     {f.label}
                  </button>
                ))}
             </div>

             {/* Grid/List Views */}
             <div className="flex items-center gap-2 border-l border-white/5 pl-6">
            <button 
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <ListIcon size={16} />
            </button>
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

        {/* Collection Grid / List */}
        {loading ? (
          <div className="py-20 text-center text-criterion opacity-20 animate-pulse uppercase tracking-[0.3em]">Synchronizing_Personal_Archive...</div>
        ) : movies.length === 0 ? (
          <div className="py-40 text-center space-y-8 glass-surface border border-white/5 rounded-3xl mx-12">
            <Bookmark size={48} className="mx-auto text-white/10" />
            <div className="space-y-2">
              <h3 className="text-4xl font-black italic tracking-tighter text-white">EMPTY ARCHIVE</h3>
              <p className="text-slate-600 font-serif italic text-xl">Search for a film and generate a summary or start a deep dive to begin.</p>
            </div>
            <Link href="/" className="inline-block pt-8 group">
              <div className="text-criterion border-b border-white hover:border-emerald-500 hover:text-emerald-500 transition-all pb-2 tracking-[0.2em]">BACK_TO_SEARCH / INITIATE</div>
            </Link>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="py-20 text-center text-white/30 font-serif italic text-xl">
             No artifacts match your current filter parameters.
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 gap-6" : "space-y-4"}>
            {filteredMovies.map((movie) => {
              if (viewMode === 'grid') {
                const isSelected = selectedIds.has(movie.id);
                return (
                  <div
                    key={movie.id}
                    onClick={() => router.push(`/movie/${movie.id}`)}
                    className={`group relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer border transition-all duration-500 ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/50 scale-[0.98]' : 'border-white/10 hover:border-white/40'}`}
                  >
                    {/* Grid Checkbox */}
                    <button 
                      onClick={(e) => toggleSelection(e, movie.id)}
                      className={`absolute top-4 right-4 z-20 p-1.5 rounded-md transition-all ${isSelected ? 'bg-emerald-500 text-white opacity-100' : 'bg-black/40 text-white/40 opacity-0 group-hover:opacity-100 hover:text-white'}`}
                    >
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                    {movie.tmdb_poster ? (
                      <img src={`https://image.tmdb.org/t/p/w500${movie.tmdb_poster}`} className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" alt="" />
                    ) : (
                      <div className="w-full h-full bg-[#0a0f16] flex items-center justify-center p-6 text-center">
                         <span className="font-black italic text-white/20 text-2xl uppercase break-words leading-none">{movie.tmdb_title || movie.title}</span>
                      </div>
                    )}
                    
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#05080c] via-[#05080c]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-6 flex flex-col justify-end">
                      <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500 space-y-4">
                        <h2 className="text-2xl font-black italic tracking-tighter text-white leading-none uppercase drop-shadow-xl">
                          {(movie.tmdb_title || movie.title)}
                        </h2>
                      </div>
                    </div>
                  </div>
                );
              }

              // List Mode
              const isSelected = selectedIds.has(movie.id);
              return (
              <div
                key={movie.id}
                className={`group relative grid grid-cols-12 gap-8 items-center p-6 hover:bg-white/[0.02] bg-[#0a0f16]/40 transition-all rounded-3xl border cursor-pointer overflow-hidden ${isSelected ? 'border-emerald-500/50 bg-emerald-500/[0.03]' : 'border-white/5 hover:border-white/20'}`}
                onClick={() => router.push(`/movie/${movie.id}`)}
              >
                {/* List Checkbox (Absolute Left) */}
                <div 
                   onClick={(e) => toggleSelection(e, movie.id)}
                   className="absolute left-6 h-full flex items-center justify-center z-20 w-8"
                >
                   <button className={`transition-all ${isSelected ? 'text-emerald-500' : 'text-white/20 group-hover:text-white/60'}`}>
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                   </button>
                </div>

                {/* Hover Backdrop Blur */}
                {movie.tmdb_poster && (
                   <div 
                      className="absolute inset-0 z-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none"
                      style={{
                         backgroundImage: `url(https://image.tmdb.org/t/p/w500${movie.tmdb_poster})`,
                         backgroundSize: 'cover',
                         backgroundPosition: 'center',
                         filter: 'blur(40px)'
                      }}
                   />
                )}
                
                {/* Poster */}
                <div className="col-span-1 relative z-10 ml-8">
                  {movie.tmdb_poster ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${movie.tmdb_poster}`}
                      alt=""
                      className="w-full rounded-xl archive-poster border border-white/10 grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center">
                      <Bookmark size={16} className="text-white/10" />
                    </div>
                  )}
                </div>

                {/* Title + metadata */}
                <div className="col-span-4 space-y-3">
                  <div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-white leading-none group-hover:translate-x-2 transition-transform duration-300">
                      {(movie.tmdb_title || movie.title).toUpperCase()}
                    </h2>
                    <div className="flex gap-4 mt-3 text-criterion opacity-40 text-[9px]">
                      <span className="bg-white/10 px-2 py-0.5 rounded">{movie.tmdb_year || "—"}</span>
                      {movie.tmdb_rating && <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20">TMDB {movie.tmdb_rating.toFixed(1)}</span>}
                    </div>
                  </div>
                </div>

                {/* Activity badges */}
                <div className="col-span-4 flex justify-end gap-x-8 gap-y-3 flex-wrap pl-8 relative z-10">
                  <ActivityBadge active={movie.has_summary} label="SUMMARY" icon={FileText} href={`/movie/${movie.id}`} />
                  <ActivityBadge active={movie.deep_dive_threads > 0} label="CHATS" count={movie.deep_dive_threads} icon={MonitorPlay} href={`/deep-dives?movie=${movie.id}`} />
                  <ActivityBadge active={movie.discussion_posts > 0} label="POSTS" count={movie.discussion_posts} icon={MessageSquare} href={`/boards?movie=${movie.id}`} />
                </div>

                {/* Action */}
                <div className="col-span-3 text-right relative z-10">
                  <div className="flex items-center justify-end gap-4 opacity-10 group-hover:opacity-100 transition-opacity text-emerald-500">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Open_Dash</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Floating Batch Actions Toolbar */}
      {selectedIds.size > 0 && (
         <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-[#161b22] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl flex items-center p-2 pr-4 gap-4">
               <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl font-mono text-[10px] font-bold">
                  {selectedIds.size} SELECTED
               </div>
               
               <div className="flex gap-2 border-l border-white/5 pl-4">
                  <button 
                     onClick={handleBatchRemove}
                     className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase font-bold tracking-widest text-criterion hover:text-white hover:bg-white/5 rounded-xl transition-all"
                  >
                     <Archive size={14} /> Hide From Ledger
                  </button>
                  <button 
                     onClick={handleBatchRemove}
                     className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase font-bold tracking-widest text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                     <Trash2 size={14} /> Delete Data
                  </button>
               </div>
               
               <button 
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-2 text-criterion hover:text-white px-2 py-1 uppercase text-[8px] tracking-widest"
               >
                  CANCEL
               </button>
            </div>
         </div>
      )}

    </div>
  );
}
