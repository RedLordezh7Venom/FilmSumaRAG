"use client";

import { useState } from "react";
import { Search, Youtube, ExternalLink, Play } from "lucide-react";

interface VideoEssay {
  title: string;
  url: string;
}

export default function ResearchPage() {
  const [movieSearch, setMovieSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [essays, setEssays] = useState<VideoEssay[]>([]);
  const [searchedMovie, setSearchedMovie] = useState<string | null>(null);

  const getYoutubeThumbnail = (url: string) => {
    try {
      const urlObj = new URL(url);
      const videoId = urlObj.searchParams.get("v") || urlObj.pathname.split("/").pop();
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    } catch (e) {
      // Ignored
    }
    return null;
  };

  const handleResearch = async () => {
    if (!movieSearch.trim()) return;
    
    setLoading(true);
    setSearchedMovie(null);
    setEssays([]);
    
    try {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
      const response = await fetch(`${primaryApiUrl}/video_essays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moviename: movieSearch })
      });
      
      if (response.ok) {
        const data = await response.json();
        setEssays(data.essays || []);
        setSearchedMovie(movieSearch);
      }
    } catch (error) {
      console.error("Research error:", error);
    } finally {
      setLoading(false);
      setMovieSearch("");
    }
  };

  return (
    <div className="cinematic-canvas p-20 font-sans selection:bg-white selection:text-black">
      <div className="film-grain" />

      <div className="max-w-6xl mx-auto space-y-24 relative z-10">
        
        <header className="flex items-end justify-between border-b border-white/10 pb-16">
          <div className="space-y-6">
             <div className="text-criterion opacity-30">Agentic_Crawler / Video_Essays</div>
             <h1 className="text-8xl font-black italic tracking-tighter text-white uppercase leading-none">Thematic Research</h1>
             <p className="text-2xl text-slate-500 font-serif italic max-w-xl">Curated visual analysis and architectural breakdowns from the cinematic community.</p>
          </div>
        </header>

        <div className="max-w-3xl space-y-6">
            <div className="text-criterion opacity-50">INITIATE_CRAWLER_TARGET</div>
            <div className="relative flex items-center">
              <input 
                type="text"
                placeholder="ENTER NARRATIVE TARGET (e.g. Blade Runner 2049)..."
                value={movieSearch}
                onChange={(e) => setMovieSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                className="w-full bg-white/[0.02] border border-white/5 py-8 pl-10 pr-40 text-2xl font-serif italic text-white outline-none focus:border-white/20 rounded-[2rem] transition-all"
              />
              <button 
                onClick={handleResearch}
                disabled={loading || !movieSearch.trim()}
                className="absolute right-4 font-black uppercase text-[10px] tracking-widest bg-white text-black px-10 py-5 rounded-xl hover:bg-slate-300 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                CRAWL
              </button>
            </div>
        </div>

        {loading && (
           <div className="py-20 text-center text-criterion opacity-30 animate-pulse">
             AGENT_CRAWLING_YOUTUBE_REPOSITORIES...
           </div>
        )}

        {searchedMovie && essays.length === 0 && !loading && (
           <div className="py-20 text-center text-criterion opacity-30">
             NO_ESSAYS_DISCOVERED
           </div>
        )}

        {essays.length > 0 && (
           <div className="space-y-12">
               <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="text-white text-3xl font-serif italic">Results for "{searchedMovie}"</div>
                  <div className="text-criterion opacity-20 text-[9px]">{essays.length}_DISCOVERED</div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {essays.map((essay, i) => (
                    <a 
                      key={i} 
                      href={essay.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block space-y-6"
                    >
                       <div className="relative aspect-video rounded-[2rem] overflow-hidden border border-white/5 group-hover:border-white/20 transition-all bg-[#0b0f17]">
                          {getYoutubeThumbnail(essay.url) ? (
                            <img 
                              src={getYoutubeThumbnail(essay.url)!}
                              className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                              alt=""
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                               <Youtube size={48} className="text-white/10" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
                             <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                                <Play size={24} className="text-white ml-2" fill="currentColor" />
                             </div>
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                          <div className="text-criterion opacity-30 flex items-center gap-2">
                             ARCHIVE_FILE // {i + 1}
                          </div>
                          <h3 className="text-2xl font-black italic tracking-tighter text-white group-hover:text-blue-200 transition-colors">
                             {essay.title}
                          </h3>
                       </div>
                    </a>
                  ))}
               </div>
           </div>
        )}

      </div>
    </div>
  );
}
