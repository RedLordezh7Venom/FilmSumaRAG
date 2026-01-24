"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryContentProps {
  movieId: string;
  length: number;
}

export default function SummaryContent({ movieId, length }: SummaryContentProps) {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function streamSummary() {
      try {
        const movieResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&append_to_response=credits,reviews`,
          { signal: controller.signal }
        );
        const movie = await movieResponse.json();

        const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : 'Unknown';
        const titleWithYear = `${movie.title} (${releaseYear})`;
        console.log('Processing movie for summary streaming:', titleWithYear);

        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";

        const response = await fetch(`${primaryApiUrl}/summarize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tmdb_id: movieId,
            movie_title: titleWithYear
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`API failed with status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder();
        let currentSummary = "";
        setIsLoading(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.token) {
                  currentSummary += data.token;
                  if (isMounted) setSummary(currentSummary);
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e, dataStr);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("Error fetching summary stream:", err);
        if (isMounted) {
          setError(err.message || "Failed to load summary");
          setIsLoading(false);
        }
      }
    }

    streamSummary();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [movieId]);

  if (isLoading && !summary) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[95%]" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-200">
        <p>Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm underline hover:text-white"
        >
          Try Again
        </button>
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
      {isLoading && (
        <div className="flex gap-1 mt-2">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
        </div>
      )}
    </div>
  );
}

