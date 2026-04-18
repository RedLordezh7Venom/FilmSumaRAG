"use client";

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
  MonitorPlay,
  MessageSquare,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@clerk/nextjs';

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
  const { user } = useUser();

  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';
  const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`
        );
        const data = await response.json();
        if (response.ok) {
          setMovie(data);
          // Auto-track that the user visited this library item
          if (user) {
            fetch(`${primaryApiUrl}/movies/collection/engage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clerk_id: user.id, tmdb_id: parseInt(id), type: 'seen' })
            }).catch(() => {});
          }
        } else {
          setMovie(null);
        }
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovieDetails();
  }, [id]);

  const handleDeepDive = () => {
    const threadId = uuidv4();
    router.push(`/deep-dive/${threadId}?movie=${movie?.id}`);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b0f17]">
       <div className="w-1 h-32 bg-white/10" />
       <div className="text-criterion opacity-30 mt-8 animate-pulse">SYNCHRONIZING_COLLECTIVE_ARCHIVE...</div>
    </div>
  );

  if (!movie) return <div className="cinematic-canvas flex items-center justify-center text-criterion opacity-30">ARCHIVE_RECORD_NOT_FOUND</div>;

  return (
    <div className="cinematic-canvas font-sans selection:bg-white selection:text-black">
      <div className="film-grain" />
      
      {/* Background Layer: Dynamic Backdrop */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/60 to-transparent" />
        <img 
          src={`${IMAGE_BASE_URL}${movie.backdrop_path}`} 
          className="w-full h-full object-cover grayscale opacity-20 blur-md scale-110"
          alt=""
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-12 pt-32 pb-20">
        <div className="grid lg:grid-cols-12 gap-24 items-start">
          
          {/* Left Side: Massive Poster Area */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 space-y-12"
          >
             <div className="rounded-[2.5rem] overflow-hidden border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
               <img 
                 src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                 className="w-full h-auto grayscale transition-all duration-1000 hover:grayscale-0"
                 alt={movie.title}
               />
             </div>

             <div className="grid grid-cols-2 gap-8 text-criterion">
                <div>
                   <div className="opacity-30 mb-2">SCORE / TMDB</div>
                   <div className="text-white text-3xl font-black italic flex items-center gap-3">
                      <Star size={24} fill="currentColor" strokeWidth={0} className="text-white" />
                      {movie.vote_average ? movie.vote_average.toFixed(1) : '—'}
                   </div>
                </div>
                <div>
                   <div className="opacity-30 mb-2">RUNTIME / MIN</div>
                   <div className="text-white text-3xl font-black italic flex items-center gap-3">
                      <Clock size={24} className="text-white" />
                      {movie.runtime}
                   </div>
                </div>
                <div>
                   <div className="opacity-30 mb-2">RELEASE / YEAR</div>
                   <div className="text-white text-3xl font-black italic flex items-center gap-3">
                      <Calendar size={24} className="text-white" />
                      {movie.release_date ? movie.release_date.split('-')[0] : '—'}
                   </div>
                </div>
                <div>
                   <div className="opacity-30 mb-2">DATABASE / LINK</div>
                   <a 
                     href={`https://www.themoviedb.org/movie/${movie.id}`}
                     target="_blank"
                     rel="noopener noreferrer" 
                     className="text-white text-3xl font-black italic flex items-center gap-3 hover:text-blue-400 transition-colors group"
                   >
                      <ExternalLink size={24} className="text-white group-hover:text-blue-400 transition-colors" />
                      TMDB
                   </a>
                </div>
             </div>
          </motion.div>

          {/* Right Side: Information Ledger */}
          <main className="lg:col-span-7 space-y-20">
             <header className="space-y-8">
                <div className="flex gap-4">
                  {movie.genres.map(g => (
                    <span key={g.id} className="text-criterion opacity-30">/ {g.name.toUpperCase()} /</span>
                  ))}
                </div>
                <h1 className="text-8xl font-black italic tracking-tighter text-white leading-none">
                  {movie.title}
                </h1>
                <p className="text-2xl text-slate-400 font-serif italic leading-relaxed max-w-3xl">
                  "{movie.overview}"
                </p>
             </header>

             {/* Action Index */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 border-t border-white/5">
                <Link 
                  href={`/summary/${movie.id}`}
                  className="block group p-10 glass-surface rounded-[2rem] border border-white/5 cursor-pointer hover:border-white/20 transition-all bg-gradient-to-br from-white/[0.02] to-transparent text-left"
                >
                   <div className="text-criterion opacity-50 mb-6 flex items-center justify-between">
                      INITIATE_SUMMARY <FileText size={16} />
                   </div>
                   <h3 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">Archival Breakdown</h3>
                </Link>

                <button 
                  onClick={handleDeepDive}
                  className="block w-full text-left group p-10 glass-surface rounded-[2rem] border border-white/5 cursor-pointer hover:border-white/20 transition-all bg-gradient-to-br from-white/[0.02] to-transparent"
                >
                   <div className="text-criterion opacity-50 mb-6 flex items-center justify-between">
                      START_RESEARCH <MonitorPlay size={16} />
                   </div>
                   <h3 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">Interactive Deep Dive</h3>
                </button>
                
                <Link 
                  href={`/movie/${movie.id}/discussions`}
                  className="md:col-span-2 group p-10 glass-surface rounded-[2rem] border border-white/5 cursor-pointer hover:border-white/20 transition-all bg-gradient-to-br from-white/[0.02] to-transparent flex items-center justify-between"
                >
                   <div>
                     <div className="text-criterion opacity-50 mb-6">COLLECTIVE_ARCHIVE</div>
                     <h3 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">Participate in Discussion</h3>
                   </div>
                   <MessageSquare className="opacity-10 group-hover:opacity-100 transition-opacity text-white" size={48} strokeWidth={1} />
                </Link>
             </div>

          </main>
        </div>
      </div>
    </div>
  );
}
