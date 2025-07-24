import { Suspense } from "react"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" passHref>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
          </Button>
        </Link>
        <Card className="bg-black/30 backdrop-blur-sm border-none shadow-xl">
          <CardContent className="p-6">
            <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              {movie.title} ({new Date(movie.release_date).getFullYear()}) - Summary
            </h1>
            <Suspense fallback={<div>Generating summary...</div>}>
              <SummaryContent movieId={movieId} length={length} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

