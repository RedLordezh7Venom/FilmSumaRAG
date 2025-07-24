'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      setMovies(data.results.slice(0, 10)); // Get only first 10 movies
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMovieClick = (movieId: number, movieTitle: string) => {
    // Navigate to home page with the movie title as search parameter
    router.push(`/?movie=${movieId}&title=${encodeURIComponent(movieTitle)}`);
  };

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 animate-gradient-slow overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_0%,_transparent_60%)] pointer-events-none"
        style={{
          backgroundPosition: `${mousePosition.x}px ${mousePosition.y}px`,
          transition: "background-position 0.3s ease-out",
        }}
      />
      <div className="container mx-auto px-4 py-16 relative z-10">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 mb-12 text-center">
          Browse Movies
        </h1>
        
        {/* Genre Filter */}
        <div className="flex gap-4 mb-12 overflow-x-auto pb-4 justify-center flex-wrap">
          <button
            onClick={() => setSelectedGenre('all')}
            className={`px-6 py-3 rounded-full text-xl transition-all ${
              selectedGenre === 'all' 
                ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-2 border-blue-400' 
                : 'bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white border-2 border-transparent hover:border-blue-400'
            }`}
          >
            All
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => setSelectedGenre(genre.id)}
              className={`px-6 py-3 rounded-full text-xl transition-all ${
                selectedGenre === genre.id 
                  ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-2 border-blue-400' 
                  : 'bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white border-2 border-transparent hover:border-blue-400'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* Movie Grid - updated with onClick handler instead of Link */}
        {loading ? (
          <div className="text-center text-2xl text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {movies.map((movie) => (
              <div 
                key={movie.id}
                onClick={() => handleMovieClick(movie.id, movie.title)}
                className="group relative rounded-xl overflow-hidden transform transition-all hover:scale-105 cursor-pointer"
              >
                <div className="aspect-[2/3] bg-gray-800">
                  {movie.poster_path && (
                    <img
                      src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 p-4">
                    <h3 className="text-lg font-bold text-white line-clamp-2">{movie.title}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 