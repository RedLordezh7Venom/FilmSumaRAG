"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { debounce } from "lodash"
import { useRouter } from "next/navigation"

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
  const router = useRouter()

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
      <div className="container mx-auto px-4 py-16 transition-all duration-300 ease-in-out relative z-10">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-8 tracking-tight">MovieRAG</h1>
            <div className="relative">
              <Input
                type="text"
                placeholder="Select your movie"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white/10 text-white placeholder:text-gray-400 pr-10"
              />
              <Button
                onClick={() => suggestions[0] && searchMovie(suggestions[0].id)}
                disabled={loading}
                className="absolute right-0 top-0 bottom-0 bg-slate-800 hover:bg-slate-700 transition-colors duration-200"
              >
                <Search className="h-4 w-4" />
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
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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
        </div>
      </div>
    </main>
  )
}

