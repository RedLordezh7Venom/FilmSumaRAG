"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { debounce } from "lodash"
import { useRouter } from "next/navigation"
import Link from "next/link"

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
  const [showSecondText, setShowSecondText] = useState(false)
  const [showThirdText, setShowThirdText] = useState(false)
  const [showFourthText, setShowFourthText] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowSecondText(true), 1332),
      setTimeout(() => setShowThirdText(true), 2664),
      setTimeout(() => setShowFourthText(true), 3996)
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  useEffect(() => {
    // Get movie ID and title from URL parameters
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('movie');
    const movieTitle = params.get('title');

    // If we have a movie ID from the URL, search for it
    if (movieId && movieTitle) {
      setSearch(movieTitle);
      searchMovie(movieId);
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
    setSearch("") // Clear the search input
    setSuggestions([]) // Clear the suggestions
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
      <div className="container mx-auto px-8 py-24 transition-all duration-300 ease-in-out relative z-10">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-400 to-slate-900 mb-8">
              Sum-A-Film
            </h1>
            <div className="relative max-w-2xl mx-auto">
              <Input
                type="text"
                placeholder="Search for a movie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/10 text-white placeholder:text-gray-400 pr-16 text-xl py-8 px-8 rounded-full border-2 border-transparent focus:border-indigo-500 transition-all"
              />
              <Button
                onClick={() => suggestions[0] && searchMovie(suggestions[0].id)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-semibold rounded-full h-14 w-14 flex items-center justify-center transition-all duration-300 hover:scale-105 hover:border-blue-400 hover:border-2 border-2 border-transparent"
              >
                <Search className="h-6 w-6" />
              </Button>
              {suggestions.length > 0 && (
                <Card className="absolute mt-1 w-full bg-black/80 backdrop-blur-sm border-none z-50">
                  <CardContent className="p-0">
                    {suggestions.map((suggestion) => (
                      <Button
                        key={suggestion.id}
                        variant="ghost"
                        className="w-full justify-start rounded-none text-white hover:bg-white/10 py-6"
                        onClick={() => searchMovie(suggestion.id)}
                      >
                        <div className="flex items-center gap-4">
                          {suggestion.poster_path && (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${suggestion.poster_path}`}
                              alt={suggestion.title}
                              className="w-10 h-15 object-cover rounded"
                            />
                          )}
                          <div className="text-left">
                            <div className="font-semibold">{suggestion.title}</div>
                            <div className="text-sm text-gray-400">
                              {new Date(suggestion.release_date).getFullYear()}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
            <div className={`mt-8 relative h-16 overflow-hidden ${
              movie ? 'hidden' : 'block'
            }`}>
              <p className={`text-4xl bg-gradient-to-r from-white via-slate-400 to-slate-900 bg-clip-text text-transparent font-medium absolute w-full transition-all duration-1000 ease-in-out ${
                showSecondText ? '-translate-y-16 opacity-0' : 'translate-y-0 opacity-100'
              }`}>
                Lost in a movie's plot? 
              </p>
              <p className={`text-4xl bg-gradient-to-r from-white via-slate-400 to-slate-900 bg-clip-text text-transparent font-medium absolute w-full transition-all duration-1000 ease-in-out ${
                !showSecondText ? 'translate-y-16 opacity-0' : 
                showThirdText ? '-translate-y-16 opacity-0' : 'translate-y-0 opacity-100'
              }`}>
                Need a quick recap?
              </p>
              <p className={`text-4xl bg-gradient-to-r from-white via-slate-400 to-slate-900 bg-clip-text text-transparent font-medium absolute w-full transition-all duration-1000 ease-in-out ${
                !showThirdText ? 'translate-y-16 opacity-0' : 
                showFourthText ? '-translate-y-16 opacity-0' : 'translate-y-0 opacity-100'
              }`}>
                Movie too long?
              </p>
              <p className={`text-4xl bg-gradient-to-r from-white via-slate-400 to-slate-900 bg-clip-text text-transparent font-medium absolute w-full transition-all duration-1000 ease-in-out ${
                !showFourthText ? 'translate-y-16 opacity-0' : 'translate-y-0 opacity-100'
              }`}>
                We got you covered
              </p>
            </div>
          </div>

          {loading && <div className="text-center text-white animate-pulse">Searching...</div>}

          {movie && (
            <Card className="bg-black/30 backdrop-blur-sm text-white border-none shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="grid md:grid-cols-[200px_1fr] gap-6">
                  {movie.poster_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                      alt={movie.title}
                      className="rounded-lg w-full max-w-[200px] mx-auto shadow-lg hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                        {movie.title} ({new Date(movie.release_date).getFullYear()})
                      </h2>
                      <Button
                        onClick={handleSummarize}
                        className="bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-2 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-blue-400 hover:border-2 border-2 border-transparent"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Summarize
                      </Button>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{movie.overview}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-center">
            <Link 
              href="/browse" 
              className="inline-flex items-center bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-semibold py-2 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-blue-400 hover:border-2 border-2 border-transparent"
            >
              <span>Browse Movies</span>
              <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

