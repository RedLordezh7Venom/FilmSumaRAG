"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Sparkles, BookOpen, Info, ArrowRight } from "lucide-react"
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
  backdrop_path: string
}

export default function Home() {
  const [search, setSearch] = useState("")
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Movie[]>([])
  const router = useRouter()

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

  return (
    <div className="cinematic-canvas font-sans selection:bg-white selection:text-black">
      <div className="film-grain" />
      
      {/* Background Layer: Dynamic Backdrop */}
      <AnimatePresence mode="wait">
        {movie && (
          <motion.div 
            key={movie.backdrop_path}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 z-0"
          >
            <img 
              src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`} 
              className="w-full h-full object-cover grayscale"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-transparent to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 container mx-auto px-12 h-screen flex items-center">
        <div className="grid grid-cols-12 gap-24 w-full">
          
          {/* Landing / Search Section */}
          <div className="col-span-12 lg:col-span-5 space-y-16">
            <header className="space-y-6">
              <div className="text-criterion">The Cinema Archive / Cinematic Analysis /</div>
              <h1 className="text-9xl font-black italic tracking-tighter leading-none text-white drop-shadow-2xl">
                SUM<br />A<br />FILM
              </h1>
            </header>

            <div className="space-y-12">
               <div className="relative group max-w-md">
                <input
                  type="text"
                  placeholder="SEARCH ARCHIVES..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-white/10 py-6 text-2xl font-serif italic text-white placeholder:text-slate-700 outline-none focus:border-white transition-all tracking-tight"
                />
                <Button
                  onClick={() => suggestions[0] && searchMovie(suggestions[0].id)}
                  disabled={loading}
                  className="absolute right-0 bottom-6 h-10 w-10 flex items-center justify-center bg-transparent hover:bg-white hover:text-black transition-all rounded-full border border-white/10"
                >
                  <Search size={22} strokeWidth={1.5} />
                </Button>

                {/* Suggestions Ledger Style */}
                <AnimatePresence>
                  {suggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-full mt-4 w-full glass-surface p-6 z-[60] space-y-4 rounded-xl shadow-2xl"
                    >
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => searchMovie(s.id)}
                          className="w-full flex items-center justify-between group hover:pl-2 transition-all p-2 rounded-lg hover:bg-white/5"
                        >
                          <div className="text-left">
                            <div className="text-white font-serif italic text-lg leading-none">{s.title}</div>
                            <div className="text-criterion opacity-40 mt-1">{new Date(s.release_date).getFullYear()}</div>
                          </div>
                          <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-white" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!movie && !loading && (
                <div className="space-y-4 max-w-sm">
                   <p className="font-serif italic text-2xl text-slate-500 leading-tight">
                    "Every film is a journey that deserves a deep, analytical entry."
                  </p>
                  <Link href="/browse" className="text-criterion hover:text-white transition-colors block pt-4">
                    [ BROWSE ALL BOARDS ]
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Result / Dashboard Card Section */}
          <div className="col-span-12 lg:col-span-7 flex items-center justify-center relative">
            {loading ? (
                <div className="flex flex-col items-center gap-8 animate-pulse">
                   <div className="w-1 h-32 bg-white/10" />
                   <div className="text-criterion">INDEXING_NARRATIVE...</div>
                </div>
            ) : (
              <AnimatePresence mode="wait">
                {movie && (
                  <motion.div 
                    key={movie.id}
                    initial={{ opacity: 0, scale: 0.98, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 1.02, x: -20 }}
                    className="w-full glass-surface p-12 rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5 flex gap-12"
                  >
                    <img 
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                      className="w-64 aspect-[2/3] object-cover rounded-2xl shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                      alt={movie.title}
                    />
                    <div className="flex flex-col justify-between py-2">
                       <div className="space-y-8">
                         <div className="space-y-2">
                            <div className="text-criterion opacity-50">RELEASED / {new Date(movie.release_date).getFullYear()}</div>
                            <h2 className="text-7xl font-black italic tracking-tighter text-white leading-none">
                              {movie.title}
                            </h2>
                         </div>
                         <p className="text-xl text-slate-400 font-serif italic leading-relaxed max-w-md">
                           "{movie.overview}"
                         </p>
                       </div>

                       <div className="flex gap-8">
                          <Link href={`/movie/${movie.id}`} className="group">
                             <div className="text-criterion group-hover:text-white transition-colors flex items-center gap-4">
                                DASHBOARD <ArrowRight size={14} />
                             </div>
                          </Link>
                          <Link href={`/deep-dive/${movie.id}`} className="group">
                             <div className="text-criterion group-hover:text-white transition-colors flex items-center gap-4">
                                DEEP DIVE <ArrowRight size={14} />
                             </div>
                          </Link>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
