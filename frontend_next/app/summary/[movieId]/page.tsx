import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Sparkles, Film } from "lucide-react"
import SummaryContent from "./summary-content"

interface SummaryPageProps {
  params: { movieId: string }
  searchParams: { length: string }
}

async function getMovieDetails(movieId: string) {
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`,
    { next: { revalidate: 3600 } },
  )
  if (!res.ok) {
    throw new Error("Failed to fetch movie details")
  }
  return res.json()
}

export default async function SummaryPage({ params, searchParams }: SummaryPageProps) {
  const movieId = params.movieId
  const length = Number.parseInt(searchParams.length) || 500

  let movie
  try {
    movie = await getMovieDetails(movieId)
  } catch (error) {
    notFound()
  }

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';

  return (
    <main className="min-h-screen bg-[#020617] text-slate-50 selection:bg-indigo-500/30 relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full" />
      <div className="fixed -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />

      <div className="container mx-auto px-6 py-12 relative z-10 max-w-4xl">
        <div className="mb-12 space-y-8">
          <Link href="/" className="inline-block">
            <Button variant="ghost" className="text-slate-400 hover:text-white -ml-4 group">
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Search
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row md:items-end gap-6 border-b border-white/10 pb-12">
            {movie.poster_path && (
              <div className="w-32 md:w-40 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] font-black tracking-widest uppercase text-indigo-400">AI Summary</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
                {movie.title}
                <span className="text-slate-500 ml-4 font-normal text-2xl md:text-3xl">({releaseYear})</span>
              </h1>
            </div>
          </div>
        </div>

        <Card className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <Suspense fallback={
              <div className="space-y-6">
                <div className="h-8 w-1/3 bg-white/5 animate-pulse rounded-lg" />
                <div className="space-y-3">
                  <div className="h-4 w-full bg-white/5 animate-pulse rounded-lg" />
                  <div className="h-4 w-[90%] bg-white/5 animate-pulse rounded-lg" />
                  <div className="h-4 w-[95%] bg-white/5 animate-pulse rounded-lg" />
                </div>
              </div>
            }>
              <SummaryContent movieId={movieId} length={length} />
            </Suspense>
          </CardContent>
        </Card>

        {/* Action Footer */}
        <div className="mt-12 flex justify-center">
          <Link href={`/deep-dive/${movieId}`}>
            <Button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold h-14 px-8 rounded-2xl transition-all flex items-center gap-3">
              <Film className="w-5 h-5 text-indigo-400" />
              Explore Deep Dive
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}


