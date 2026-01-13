"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Sparkles, BookOpen, Film, Clapperboard, MonitorPlay } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { debounce } from "lodash"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

interface Movie {
  id: number
  title: string
  release_date: string
  poster_path: string
  overview: string
}

export default function Home() {
  const [search, setSearch] = useState("")
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Movie[]>([])
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const router = useRouter()

  const taglines = [
    "Lost in a movie's plot?",
    "Need a quick recap?",
    "Movie too long?",
    "Then jump right in!"
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % taglines.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('movie');
    const movieTitle = params.get('title');

    if (movieId && movieTitle) {
      setSearch(movieTitle);
      searchMovie(Number(movieId));
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
  }

  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([])
        return
      }
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(query)}`,
        )
        const data = await response.json()
        if (data.results) {
          setSuggestions(data.results.slice(0, 5))
        } else {
          setSuggestions([])
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        setSuggestions([])
      }
    }, 300),
    [],
  )

  useEffect(() => {
    fetchSuggestions(search)
  }, [search, fetchSuggestions])

  const searchMovie = async (movieId: number) => {
    if (!movieId) return

    setLoading(true)
    setSearch("")
    setSuggestions([])
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`,
      )
      const data = await response.json()
      if (data.id) {
        setMovie(data)
      } else {
        setMovie(null)
      }
    } catch (error) {
      console.error("Error fetching movie:", error)
    }
    setLoading(false)
  }

  const handleSummarize = () => {
    if (movie) {
      router.push(`/summary/${movie.id}?length=1000`)
    }
  }

  return (
    <main
      className="min-h-screen bg-[#020617] text-slate-50 selection:bg-indigo-500/30 overflow-x-hidden relative"
      onMouseMove={handleMouseMove}
    >
      {/* Dynamic Background Glow */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.15), transparent 40%)`,
        }}
      />

      {/* Animated Gradient Orbs */}
      <div className="fixed -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
      <div className="fixed -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />

      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-12">

          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 backdrop-blur-xl">
                <Clapperboard className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
            <h1 className="text-7xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
              Sum-A-Film
            </h1>
            <p className="text-slate-400 text-lg font-medium tracking-wide">
              AI-POWERED CINEMATIC INTELLIGENCE
            </p>
          </motion.div>

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-2xl relative"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-25 group-focus-within:opacity-50 transition duration-1000" />
              <div className="relative flex items-center">
                <Input
                  type="text"
                  placeholder="The Dark Knight, Interstellar, Pulp Fiction..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-black/40 border-white/10 text-white placeholder:text-slate-500 pr-16 text-lg h-20 px-10 rounded-full backdrop-blur-2xl focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-2xl"
                />
                <Button
                  onClick={() => suggestions[0] && searchMovie(suggestions[0].id)}
                  disabled={loading}
                  className="absolute right-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full h-14 w-14 flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                  {loading ? <div className="w-6 h-6 border-b-2 border-white rounded-full animate-spin" /> : <Search className="h-6 w-6" />}
                </Button>
              </div>
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute mt-4 w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                >
                  <div className="p-2 space-y-1">
                    {suggestions.map((suggestion, idx) => (
                      <motion.button
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors group text-left"
                        onClick={() => searchMovie(suggestion.id)}
                      >
                        <div className="w-12 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-800 border border-white/5 group-hover:border-indigo-500/50 transition-colors">
                          {suggestion.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${suggestion.poster_path}`}
                              alt={suggestion.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-4 h-4 text-slate-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">{suggestion.title}</div>
                          <div className="text-sm text-slate-400">
                            {suggestion.release_date ? new Date(suggestion.release_date).getFullYear() : 'N/A'}
                          </div>
                        </div>
                        <Sparkles className="w-4 h-4 text-indigo-500/40 group-hover:text-indigo-500 transition-colors mr-2" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Animated Tagline */}
          <div className={`w-full max-w-2xl flex justify-center h-12 ${movie ? 'hidden' : 'flex'}`}>
            <AnimatePresence mode="wait">
              <motion.p
                key={currentTextIndex}
                initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                transition={{ duration: 0.5 }}
                className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400"
              >
                {taglines[currentTextIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Movie Result Card */}
          <AnimatePresence>
            {movie && (
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                className="w-full"
              >
                <Card className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] overflow-hidden rounded-[2.5rem]">
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row gap-10">
                      <div className="w-full md:w-[240px] shrink-0">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[2/3] group"
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          {movie.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                              alt={movie.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                              <Film className="w-12 h-12 text-slate-700" />
                            </div>
                          )}
                        </motion.div>
                      </div>

                      <div className="flex-1 space-y-8 flex flex-col justify-between py-2">
                        <div className="space-y-4">
                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-2"
                          >
                            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                              {movie.title}
                              <span className="text-slate-500 ml-4 font-normal text-3xl">
                                {movie.release_date ? new Date(movie.release_date).getFullYear() : ''}
                              </span>
                            </h2>
                          </motion.div>
                          <p className="text-slate-400 text-lg leading-relaxed line-clamp-6">
                            {movie.overview}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                          <Link href={`/deep-dive/${movie.id}`} className="flex-1 md:flex-none">
                            <Button
                              variant="outline"
                              className="w-full bg-white/5 hover:bg-white/10 border-white/10 text-white font-bold h-14 px-8 rounded-2xl transition-all flex items-center gap-3 backdrop-blur-md"
                            >
                              <BookOpen className="w-5 h-5 text-indigo-400" />
                              Deep Dive
                            </Button>
                          </Link>
                          <Button
                            onClick={handleSummarize}
                            className="flex-1 md:flex-none bg-indigo-500 hover:bg-indigo-600 text-white font-bold h-14 px-8 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-3"
                          >
                            <Sparkles className="w-5 h-5" />
                            Generate Summary
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-12"
          >
            <Link
              href="/browse"
              className="group relative flex items-center gap-4 px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all active:scale-95"
            >
              <MonitorPlay className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold tracking-wide">Explore Browse Gallery</span>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  )
}

