import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import { Skeleton } from "@/components/ui/skeleton";

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

  try {
    if (primaryApiUrl) {
      response = await fetch(`${primaryApiUrl}/summarize`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moviename: movie.title
        }),
      });

      if (response.ok) {
        data = await response.json();
        return data;
      } else {
        console.warn(`Primary API URL (${primaryApiUrl}) failed with status: ${response.status}. Attempting fallback.`);
      }
    }
  } catch (error) {
    console.warn(`Primary API URL (${primaryApiUrl}) failed:`, error, "Attempting fallback.");
  }

  try {
    response = await fetch(`${fallbackApiUrl}/summarize`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        moviename: movie.title
      }),
    });

    if (response.ok) {
      data = await response.json();
      return data;
    } else {
      throw new Error(`Fallback API URL (${fallbackApiUrl}) failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching summary from FastAPI (both primary and fallback failed):", error);
    throw new Error("Backend not working: API is offline.");
  }
}

export default async function SummaryContent({ movieId, length }: SummaryContentProps) {
  const summary = await generateSummary(movieId, length);

  if (!summary) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[95%]" />
      </div>
    );
  }

  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 text-white">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mb-3 text-gray-200">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium mb-2 text-gray-300">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-gray-300 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 mb-4 text-gray-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 mb-4 text-gray-300">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="mb-1">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-600 pl-4 italic mb-4 text-gray-400">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-gray-800 rounded px-1 py-0.5 text-sm text-gray-300">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-gray-800 rounded p-4 overflow-x-auto mb-4">
              {children}
            </pre>
          ),
        }}
      >
        {summary}
      </ReactMarkdown>
    </div>
  );
}
