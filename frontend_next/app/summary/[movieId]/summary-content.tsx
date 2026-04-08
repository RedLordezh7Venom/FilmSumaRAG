"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

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
        const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        const movieResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`,
          { signal: controller.signal }
        );
        const movie = await movieResponse.json();

        const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : 'Unknown';
        const titleWithYear = `${movie.title} (${releaseYear})`;

        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

        const response = await fetch(`${primaryApiUrl}/summarize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
              moviename: titleWithYear,
              tmdb_id: parseInt(movieId)
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`API failed with status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";
        
        // Backend returns JSON directly for cached summaries
        if (contentType.includes("application/json")) {
          const data = await response.json();
          if (isMounted) {
            setSummary(data.token || JSON.stringify(data));
            setIsLoading(false);
          }
          return;
        }

        // SSE streaming for fresh summaries
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder();
        let currentSummary = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                if (isMounted) setIsLoading(false);
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.token) {
                  currentSummary += data.token;
                  if (isMounted) {
                    setSummary(currentSummary);
                    setIsLoading(false);
                  }
                }
              } catch (e) { /* partial SSE line, skip */ }
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
      <div className="py-20 flex flex-col items-center justify-center gap-8">
         <div className="w-1 h-32 bg-white/10" />
         <div className="text-criterion opacity-20 animate-pulse uppercase tracking-[0.5em] text-[10px]">
            SYNCHRONIZING_COLLECTIVE_ARCHIVE...
         </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-12 border border-red-500/20 bg-red-500/5 rounded-[2rem] text-center space-y-6">
        <div className="text-criterion text-red-500">Archive_Access_Error</div>
        <p className="text-slate-400 font-serif italic text-lg">{error}</p>
        <button onClick={() => window.location.reload()} className="text-criterion border-b border-white pb-1">[ RE_INITIATE ]</button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="text-criterion opacity-20 text-[9px] mb-4">ARCHIVAL_BREAKDOWN_OUTPUT:</div>
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-5xl font-black italic tracking-tighter text-white mb-8">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-3xl font-black italic tracking-tighter text-white mb-6 mt-12">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-2xl font-bold italic text-white mb-4 mt-8">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="mb-6 text-slate-300 font-serif italic text-xl leading-loose">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-none pl-0 mb-6 text-slate-300 space-y-3">{children}</ul>
            ),
            li: ({ children }) => (
              <li className="font-serif italic text-lg text-slate-400 flex gap-4 items-start">
                <span className="text-white/20 text-criterion text-[9px] mt-2">▪</span>
                <span>{children}</span>
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-white/10 pl-8 my-8 text-slate-500 font-serif italic text-2xl">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="bg-white/5 rounded px-2 py-1 text-sm text-white font-mono">
                {children}
              </code>
            ),
          }}
        >
          {summary}
        </ReactMarkdown>
      </div>
      
      {isLoading && (
        <div className="flex gap-3 pt-8 pb-20">
           <div className="text-criterion opacity-10 animate-pulse">STREAMING_NARRATIVE_DATA...</div>
        </div>
      )}
    </div>
  );
}
