"use client"

import { useState, useEffect } from "react"
import { 
  Bookmark, FileText, MessageSquare, MonitorPlay, 
  ArrowRight, CheckCircle2, Circle, ExternalLink 
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

  const ActivityBadge = ({ active, label, icon: Icon }: { active: boolean; label: string; icon: any }) => (
    <div className={`flex items-center gap-2 text-[10px] transition-all ${active ? 'text-white' : 'text-white/10'}`}>
      {active ? <CheckCircle2 size={12} className="text-green-500" /> : <Circle size={12} />}
      <span className="text-criterion">{label}</span>
    </div>
  );

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
          <div className="text-right space-y-2">
            <div className="text-white font-mono text-4xl">{movies.length}</div>
            <div className="text-criterion opacity-30 text-[9px]">FILMS_IN_ARCHIVE</div>
          </div>
        </header>

        {/* Collection Grid */}
        {loading ? (
          <div className="py-20 text-center text-criterion opacity-20 animate-pulse">SYNCHRONIZING_PERSONAL_ARCHIVE...</div>
        ) : movies.length === 0 ? (
          <div className="py-40 text-center space-y-8">
            <Bookmark size={48} className="mx-auto text-white/10" />
            <div className="space-y-2">
              <h3 className="text-4xl font-black italic tracking-tighter text-white">EMPTY COLLECTION</h3>
              <p className="text-slate-600 font-serif italic text-xl">Search for a film and generate a summary or start a deep dive to begin building your collection.</p>
            </div>
            <Link href="/" className="inline-block pt-8">
              <div className="text-criterion border-b border-white hover:opacity-50 transition-opacity pb-2">BACK_TO_ARCHIVE_SEARCH</div>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {movies.map((movie) => (
              <div
                key={movie.id}
                className="group grid grid-cols-12 gap-8 items-center p-8 hover:bg-white/[0.01] transition-all rounded-2xl border border-transparent hover:border-white/5 cursor-pointer"
                onClick={() => router.push(`/movie/${movie.id}`)}
              >
                {/* Poster */}
                <div className="col-span-1">
                  {movie.tmdb_poster ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${movie.tmdb_poster}`}
                      alt=""
                      className="w-full rounded-lg archive-poster border border-white/5"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-center">
                      <Bookmark size={16} className="text-white/10" />
                    </div>
                  )}
                </div>

                {/* Title + metadata */}
                <div className="col-span-5 space-y-3">
                  <div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-white leading-none group-hover:pl-2 transition-all duration-300">
                      {(movie.tmdb_title || movie.title).toUpperCase()}
                    </h2>
                    <div className="flex gap-6 mt-2 text-criterion opacity-30 text-[9px]">
                      <span>{movie.tmdb_year || "—"}</span>
                      {movie.tmdb_rating && <span>TMDB: {movie.tmdb_rating.toFixed(1)}</span>}
                      <span>DB_ID: {movie.id}</span>
                    </div>
                  </div>
                </div>

                {/* Activity badges */}
                <div className="col-span-4 flex gap-8">
                  <ActivityBadge active={movie.has_summary} label="SUMMARIZED" icon={FileText} />
                  <ActivityBadge active={movie.has_deep_dive} label={`DEEP_DIVE (${movie.deep_dive_threads})`} icon={MonitorPlay} />
                  <ActivityBadge active={movie.has_discussions} label={`DISCUSSED (${movie.discussion_posts})`} icon={MessageSquare} />
                </div>

                {/* Action */}
                <div className="col-span-2 text-right">
                  <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-criterion text-[9px]">OPEN_DASHBOARD</span>
                    <ArrowRight size={14} className="text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
