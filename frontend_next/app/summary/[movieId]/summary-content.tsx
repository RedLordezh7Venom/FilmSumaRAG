"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { Typewriter } from "@/components/effects/typewriter";

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

        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";

        const response = await fetch(`${primaryApiUrl}/summarize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            moviename: titleWithYear
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
      <div className="py-20 flex flex-col items-center justify-center gap-8">
         <div className="w-1 h-20 bg-white/10" />
         <div className="text-criterion opacity-20 animate-pulse uppercase tracking-[0.5em] text-[10px]">
            SYNCHRONIZING_NARRATIVE_SUMMARY...
         </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="p-12 border border-red-500/20 bg-red-500/5 rounded-[2rem] text-center space-y-6">
        <div className="text-criterion text-red-500 uppercase">Archive_Access_Error</div>
        <p className="text-slate-400 font-serif italic text-lg leading-relaxed">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-criterion border-b border-white pb-1 hover:opacity-50 transition-opacity"
        >
          [ RE_INITIATE_FETCH ]
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="text-criterion opacity-20 text-[9px] mb-4">ARCHIVAL_BREAKDOWN_OUTPUT:</div>
      <div className="text-3xl font-serif italic text-slate-300 leading-loose">
        <Typewriter text={summary} speed={5} />
      </div>
      
      {isLoading && (
        <div className="flex gap-3 pt-8 pb-20">
           <div className="text-criterion opacity-10 animate-pulse">STREAMING_NARRATIVE_DATA...</div>
        </div>
      )}
    </div>
  );
}
