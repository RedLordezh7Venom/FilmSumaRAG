'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Film, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { ScrollReveal } from '@/components/effects/scroll-reveal';

gsap.registerPlugin(ScrollTrigger);

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
  const gridRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!loading && gridRef.current) {
      const cards = gridRef.current.querySelectorAll('[data-movie-card]') as NodeListOf<HTMLElement>;
      
      cards.forEach((card, index) => {
        gsap.from(card, {
          opacity: 0,
          y: 30,
          duration: 0.6,
          delay: index * 0.05,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            once: true,
          },
        });
      });

      return () => {
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      };
    }
  }, [movies, loading]);

  const fetchGenres = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
      );
      const data = await response.json();
      setGenres(data.genres || []);
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

  return (
    <div className="cinematic-canvas p-20 font-sans selection:bg-white selection:text-black">
      <div className="film-grain" />
      
      <div className="max-w-7xl mx-auto space-y-20 relative z-10">
        {/* Header */}
        <motion.header 
          className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="text-criterion opacity-30">Archive_Unit / Browse_Catalog</div>
            <h1 className="text-8xl font-black italic tracking-tighter leading-none text-white">BROWSE ARCHIVE</h1>
            <p className="text-2xl text-slate-500 font-serif italic max-w-xl">
              Discover films and trigger deep dives into their hidden meanings.
            </p>
          </motion.div>

          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <motion.input 
              type="text"
              placeholder="SEARCH_ARCHIVE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 bg-transparent border-b border-white/10 py-4 pl-12 pr-4 text-white font-serif italic outline-none focus:border-white transition-all text-lg"
              whileFocus={{ scale: 1.05 }}
            />
          </motion.div>
        </motion.header>

        {/* Genre Filter */}
        <motion.div 
          className="flex gap-4 overflow-x-auto pb-4 no-scrollbar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.button
            onClick={() => setSelectedGenre('all')}
            className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
              selectedGenre === 'all' 
                ? 'bg-white text-black border-white' 
                : 'bg-transparent text-white/30 border-white/5 hover:border-white/20 hover:text-white'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ALL
          </motion.button>
          {genres.map((genre, index) => (
            <motion.button
              key={genre.id}
              onClick={() => setSelectedGenre(genre.id)}
              className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
                selectedGenre === genre.id 
                  ? 'bg-white text-black border-white' 
                  : 'bg-transparent text-white/30 border-white/5 hover:border-white/20 hover:text-white'
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.02 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {genre.name}
            </motion.button>
          ))}
        </motion.div>

        {/* Movie Grid */}
        <motion.div 
          ref={gridRef}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
            ))
          ) : (
            movies.map((movie) => (
              <motion.div
                key={movie.id}
                onClick={() => router.push(`/movie/${movie.id}`)}
                className="group relative cursor-pointer"
                data-movie-card
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
              >
                <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[0_0_60px_rgba(0,0,0,0.5)]">
                  {movie.poster_path ? (
                    <img
                      src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full h-full object-cover archive-poster"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/10 bg-white/[0.02]">
                      <Film size={48} strokeWidth={1} />
                      <span className="text-criterion">{movie.title}</span>
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-1 text-criterion text-white">
                          <Star size={10} fill="currentColor" />
                          {movie.vote_average?.toFixed(1) || 'N/A'}
                        </div>
                        <span className="text-criterion opacity-40">
                          {movie.release_date ? new Date(movie.release_date).getFullYear() : '—'}
                        </span>
                      </div>
                      <h3 className="text-white font-black italic tracking-tighter text-xl leading-tight">{movie.title}</h3>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
