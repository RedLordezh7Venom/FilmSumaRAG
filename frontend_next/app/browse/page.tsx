'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Filter, Film, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  genre_ids: number[];
}

interface Genre {
  id: number;
  name: string;
}

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export default function BrowsePage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [selectedGenre]);

  const fetchGenres = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
      );
      const data = await response.json();
      setGenres(data.genres);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const fetchMovies = async () => {
    setLoading(true);
    try {
      let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=1`;

      if (selectedGenre !== 'all') {
        url += `&with_genres=${selectedGenre}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setMovies(data.results.slice(0, 15)); // Get first 15 movies
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMovieClick = (movieId: number, movieTitle: string) => {
    router.push(`/?movie=${movieId}&title=${encodeURIComponent(movieTitle)}`);
  };

  return (
    <main
      className="min-h-screen bg-[#020617] text-slate-50 selection:bg-indigo-500/30 overflow-x-hidden relative"
      onMouseMove={handleMouseMove}
    >
      {/* Dynamic Background Glow */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.1), transparent 40%)`,
        }}
      />

      <div className="container mx-auto px-6 py-12 relative z-10 space-y-12">

        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="text-slate-400 hover:text-white -ml-4 group"
            >
              <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Button>
            <h1 className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
              Browse Gallery
            </h1>
          </div>

          <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
            <Filter className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold tracking-widest uppercase text-slate-400">Filter by Genre</span>
          </div>
        </div>

        {/* Genre Slider */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide no-scrollbar -mx-6 px-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedGenre('all')}
            className={`px-8 py-3 rounded-2xl font-bold transition-all shrink-0 border ${selectedGenre === 'all'
                ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
          >
            All Featured
          </motion.button>
          <AnimatePresence>
            {genres.map((genre) => (
              <motion.button
                key={genre.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedGenre(genre.id)}
                className={`px-8 py-3 rounded-2xl font-bold transition-all shrink-0 border ${selectedGenre === genre.id
                    ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
              >
                {genre.name}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Movie Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
            >
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-3xl bg-white/5 animate-pulse" />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8"
            >
              {movies.map((movie, idx) => (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -10 }}
                  onClick={() => handleMovieClick(movie.id, movie.title)}
                  className="group relative cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded-[2rem] overflow-hidden border border-white/5 bg-slate-900 shadow-2xl transition-all group-hover:border-indigo-500/50 group-hover:shadow-indigo-500/10">
                    {movie.poster_path ? (
                      <img
                        src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <Film className="w-8 h-8 text-slate-700" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest px-4 text-center">{movie.title}</span>
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 p-6 w-full space-y-2">
                        <PlayCircle className="w-10 h-10 text-indigo-400 mb-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500" />
                        <h3 className="text-lg font-bold text-white line-clamp-2 leading-tight">
                          {movie.title}
                        </h3>
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">View Insights</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
