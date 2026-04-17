import { Suspense, use } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, Info } from "lucide-react"
import SummaryContent from "./summary-content"

interface SummaryPageProps {
  params: Promise<{ movieId: string }>
  searchParams: Promise<{ length: string }>
}

async function getMovieDetails(movieId: string) {
  const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`,
    { next: { revalidate: 3600 } },
  )
  if (!res.ok) {
    throw new Error("Failed to fetch movie details")
  }
  return res.json()
}

export default async function SummaryPage({ params, searchParams }: SummaryPageProps) {
  const { movieId } = await params
  const { length: lengthParam } = await searchParams
  const length = Number.parseInt(lengthParam) || 500

  let movie
  try {
    movie = await getMovieDetails(movieId)
  } catch (error) {
    notFound()
  }

  return (
    <div className="cinematic-canvas font-sans selection:bg-white selection:text-black">
      <div className="film-grain" />

      {/* Background Layer: Subtle Blur */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#0b0f17]/95" />
        <img
          src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
          className="w-full h-full object-cover opacity-10 blur-3xl"
          alt=""
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-12 pt-32 pb-20">
        <div className="space-y-20">

          <header className="space-y-8 flex items-end justify-between border-b border-white/5 pb-16">
            <div className="space-y-6">
              <Link href={`/movie/${movieId}`} className="text-criterion opacity-30 hover:opacity-100 transition-opacity flex items-center gap-3">
                <ArrowLeft size={14} /> [ RETURN_TO_DASHBOARD ]
              </Link>
              <h1 className="text-8xl font-black italic tracking-tighter text-white leading-none">
                ARCHIVAL_BREAKDOWN
              </h1>
              <div className="flex gap-8 text-[9px] text-criterion opacity-20">
                <div>MOVIE: {movie.title.toUpperCase()}</div>
                <div>RELEASE_DYNAMO: {new Date(movie.release_date).getFullYear()}</div>
              </div>
            </div>
          </header>

          <Suspense fallback={
            <div className="py-20 flex flex-col items-center justify-center gap-8">
              <div className="w-1 h-20 bg-white/10" />
              <div className="text-criterion opacity-20 animate-pulse uppercase tracking-[0.5em] text-[10px]">
                GENERATING_SYNOPSIS_STREAM...
              </div>
            </div>
          }>
            <div className="max-w-4xl mx-auto">
              <SummaryContent movieId={movieId} length={length} />
            </div>
          </Suspense>

        </div>
      </div>
    </div>
  );
}
