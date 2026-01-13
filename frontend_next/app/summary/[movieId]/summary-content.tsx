import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

interface SummaryContentProps {
  movieId: string;
  length: number;
}

async function generateSummary(movieId: string, length: number) {
  const movie = await fetch(
    `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&append_to_response=credits,reviews`
  ).then((res) => res.json());

  const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
  const fallbackApiUrl = "http://127.0.0.1:8000";

  let response;
  let data;
  const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : 'Unknown';
  const titleWithYear = `${movie.title} (${releaseYear})`;

  try {
    if (primaryApiUrl) {
      response = await fetch(`${primaryApiUrl}/summarize`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moviename: titleWithYear
        }),
      });

      if (response.ok) {
        data = await response.json();
        return data;
      }
    }
  } catch (error) {
    console.warn(`Primary API failed, attempting fallback.`);
  }

  try {
    response = await fetch(`${fallbackApiUrl}/summarize`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        moviename: titleWithYear
      }),
    });

    if (response.ok) {
      data = await response.json();
      return data;
    }
  } catch (error) {
    console.error("All APIs failed.");
    return null;
  }
}

export default async function SummaryContent({ movieId, length }: SummaryContentProps) {
  const summary = await generateSummary(movieId, length);

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <div className="p-4 bg-red-500/10 rounded-full">
          <Sparkles className="w-8 h-8 text-red-400 opacity-50" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Analysis Interrupted</h3>
          <p className="text-slate-400 max-w-xs">The cinematic engine is currently offline. Please ensure the backend server is running.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-black mb-8 text-white tracking-tight border-b border-white/5 pb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-bold mt-12 mb-6 text-indigo-400 tracking-tight">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-bold mt-8 mb-4 text-white tracking-tight">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-6 text-slate-300 leading-relaxed text-lg">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-3 mb-8 text-slate-300">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex gap-3">
              <span className="text-indigo-500 shrink-0 mt-1.5">•</span>
              <span>{children}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500 bg-white/5 rounded-r-2xl p-6 italic mb-8 text-slate-300">
              {children}
            </blockquote>
          ),
        }}
      >
        {summary}
      </ReactMarkdown>
    </div>
  );
}

