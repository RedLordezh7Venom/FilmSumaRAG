import { GoogleGenerativeAI } from "@google/generative-ai"

interface SummaryContentProps {
  movieId: string
  length: number
}

async function generateSummary(movieId: string, length: number) {
  const movie = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&append_to_response=credits,reviews`,
  ).then((res) => res.json())

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })

  const director = movie.credits.crew.find((person: any) => person.job === "Director")?.name || "Unknown"
  const cast = movie.credits.cast
    .slice(0, 5)
    .map((actor: any) => actor.name)
    .join(", ")
  const reviews = movie.reviews.results
    .slice(0, 3)
    .map((review: any) => review.content)
    .join("\n\n")

  const prompt = `
    You are a movie expert tasked with summarizing films. Summarize the movie "${movie.title}" in approximately ${length} words. 
    Use the following information:
    
    Plot: ${movie.overview}
    
    Director: ${director}
    
    Main Cast: ${cast}
    
    User Reviews: ${reviews}
    
    Provide a concise and engaging summary that captures the essence of the movie, its main themes, and critical reception. 
    Focus on the most important aspects and ensure the summary is coherent and well-structured.
  `

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  return text
}

export default async function SummaryContent({ movieId, length }: SummaryContentProps) {
  const summary = await generateSummary(movieId, length)

  return (
    <div className="prose prose-invert max-w-none">
      <p>{summary}</p>
    </div>
  )
}

