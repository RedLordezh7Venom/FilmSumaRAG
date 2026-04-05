'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, 
  Star, 
  Clock, 
  ChevronRight, 
  Zap, 
  FileText,
  Play,
  ArrowLeft,
  Youtube,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  runtime: number;
  genres: { id: number; name: string }[];
}

export default function MovieDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`
        );
        const data = await response.json();
        setMovie(data);
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovieDetails();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-white rounded-full animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Synchronizing Narrative DNA</p>
      </div>
    </div>
  );

  if (!movie) return <div className="p-20 text-center text-slate-400 bg-black min-h-screen">Movie not found.</div>;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#030712] text-white">
      {/* Dynamic Background Backdrop */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/80 to-transparent" />
        <img 
          src={`${IMAGE_BASE_URL}${movie.backdrop_path}`} 
          alt={movie.title}
          className="w-full h-full object-cover opacity-20 blur-xl scale-110"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Left: Poster */}
          <motion.aside 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4"
          >
            <div className="rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative">
              <img 
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                alt={movie.title}
                className="w-full h-auto"
              />
            </div>
          </motion.aside>

          {/* Right: Info & The Modes (Hidden initially as cards) */}
          <main className="lg:col-span-8 space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold border border-purple-500/20 tracking-widest uppercase">Movie</span>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={16} fill="currentColor" />
                  <span className="font-bold">{movie.vote_average.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-sm">
                  <Clock size={16} />
                  <span>{movie.runtime} min</span>
                </div>
              </div>

              <h1 className="text-6xl font-bold tracking-tight text-white leading-tight">
                {movie.title}
              </h1>

              <div className="flex flex-wrap gap-2">
                {movie.genres.map(g => (
                  <span key={g.id} className="px-4 py-1 rounded-full bg-slate-900 border border-white/5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    {g.name}
                  </span>
                ))}
              </div>

              <p className="text-xl text-slate-400 leading-relaxed max-w-3xl">
                {movie.overview}
              </p>
            </div>

            {/* ACTION CARDS (The "Hidden" entry points) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
              <motion.div 
                whileHover={{ y: -5 }}
                onClick={() => router.push(`/summary/${movie.id}`)}
                className="p-8 glass-card border border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent cursor-pointer group rounded-3xl"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mb-6 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
                  <FileText className="text-indigo-400" size={28} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Summary Mode</h3>
                <p className="text-slate-400 mb-6 text-sm">
                  Get high-level AI plot summaries, character analysis, and thematic breakdowns.
                </p>
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-widest">
                  Generate Summary <ChevronRight size={18} />
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ y: -5 }}
                onClick={() => router.push(`/deep-dive/${movie.id}`)}
                className="p-8 glass-card border border-white/5 bg-gradient-to-br from-purple-500/10 to-transparent cursor-pointer group rounded-3xl"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mb-6 group-hover:border-purple-500/50 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
                  <Zap className="text-purple-400" size={28} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Deep Dive Mode</h3>
                <p className="text-slate-400 mb-6 text-sm">
                  Interactive RAG-based chat. Question the script, philosophy, and hidden details.
                </p>
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm uppercase tracking-widest">
                  Start Analysis <ChevronRight size={18} />
                </div>
              </motion.div>
            </div>

            {/* Video Essays Section */}
            <div className="space-y-8 pt-12 border-t border-slate-900">
              <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-slate-600">Curated Video Essays</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((essay) => (
                  <div key={essay} className="group cursor-pointer rounded-2xl bg-white/5 border border-white/5 overflow-hidden hover:border-white/20 transition-all">
                    <div className="aspect-video bg-slate-900 flex items-center justify-center relative">
                      <Youtube size={48} className="text-white/20 group-hover:text-red-500/80 transition-colors" />
                      <div className="absolute inset-0 bg-slate-950 opacity-0 group-hover:opacity-40 transition-opacity" />
                    </div>
                    <div className="p-6">
                      <h4 className="text-white font-bold mb-2">Cinematic Analysis: {movie.title}</h4>
                      <p className="text-slate-500 text-sm">Visual language and subtext breakdown.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
