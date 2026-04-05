'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Film, Star } from 'lucide-react';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  genre_ids: number[];
  vote_average: number;
  release_date: string;
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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [selectedGenre, searchQuery]);

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
      let url = '';
      if (searchQuery) {
        url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&language=en-US&page=1&include_adult=false`;
      } else {
        url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=1`;
        if (selectedGenre !== 'all') {
          url += `&with_genres=${selectedGenre}`;
        }
      }

      const response = await fetch(url);
      const data = await response.json();
      setMovies(data.results || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMovieClick = (movieId: number, movieTitle: string) => {
    router.push(`/movie/${movieId}`);
  };

  return (
    <div className="min-h-screen pb-20 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-white">
              Browse <span className="text-gradient">Catalog</span>
            </h1>
            <p className="text-slate-400 max-w-md">
              Discover the latest films and trigger deep dives into their hidden meanings.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-slate-200 outline-none focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>
        </header>

        {/* Genre Filter */}
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          <button
            onClick={() => setSelectedGenre('all')}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              selectedGenre === 'all' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                : 'glass text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            All Movies
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => setSelectedGenre(genre.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedGenre === genre.id 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                  : 'glass text-slate-400 hover:text-slate-200 hover:border-white/20'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* Movie Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] rounded-2xl glass animate-pulse" />
              ))
            ) : (
              movies.map((movie, idx) => (
                <motion.div
                  key={movie.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleMovieClick(movie.id, movie.title)}
                  className="group relative cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded-2xl overflow-hidden glass-card transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] group-hover:border-purple-500/30">
                    {movie.poster_path ? (
                      <img
                        src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                        alt={movie.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-600">
                        <Film size={48} strokeWidth={1} />
                        <span className="text-xs font-medium px-4 text-center">{movie.title}</span>
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                      <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[10px] font-bold border border-amber-500/20">
                            <Star size={10} fill="currentColor" />
                            {movie.vote_average.toFixed(1)}
                          </div>
                          <span className="text-slate-400 text-xs">{new Date(movie.release_date).getFullYear()}</span>
                        </div>
                        <h3 className="text-white font-bold line-clamp-2 leading-tight">{movie.title}</h3>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
 