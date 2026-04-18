"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import { ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { useUser } from "@clerk/nextjs";

interface SummaryContentProps {
  movieId: string;
  length: number;
}

// --- Warm-up preamble: shown while backend fetches subtitles ---
const WARMUP_LINES = [
  "Accessing archival transcript database...",
  "Cross-referencing dialogue signatures...",
  "Initializing narrative extraction engine...",
];

function usePreambleTypewriter(active: boolean) {
  const [text, setText] = useState("");
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (!active) { setText(""); return; }
    if (lineIndex >= WARMUP_LINES.length) return;

    const currentLine = WARMUP_LINES[lineIndex];
    if (charIndex < currentLine.length) {
      const t = setTimeout(() => {
        setText(prev => prev + currentLine[charIndex]);
        setCharIndex(c => c + 1);
      }, 38);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setText(prev => prev + "\n");
        setLineIndex(l => l + 1);
        setCharIndex(0);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [active, charIndex, lineIndex]);

  return text;
}

// --- Feedback Bar ---
function FeedbackBar({ movieId }: { movieId: string }) {
  const { user, isSignedIn } = useUser();
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleRate = (r: "up" | "down") => {
    if (!isSignedIn) return;
    setRating(r);
    if (r === "down") {
      setShowComment(true); // Ask for optional comment before submitting downvote
    } else {
      submitFeedback(r, "");
    }
  };

  const submitFeedback = async (r: "up" | "down", c: string) => {
    if (!user) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
      await fetch(`${apiUrl}/feedback/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerk_id: user.id,
          tmdb_id: parseInt(movieId),
          upvote: r === "up",
          context: "summary",
          comment: c || null,
        }),
      });
    } catch (e) {
      // Silently fail — feedback is non-critical
    } finally {
      setSubmitted(true);
      setShowComment(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-3 pt-16 pb-8 opacity-40">
        <span className="text-criterion text-[9px] tracking-widest">ARCHIVE_FEEDBACK_LOGGED</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="pt-16 pb-8 border-t border-white/5">
        <p className="text-white/20 text-[10px] font-mono tracking-widest">
          [ SIGN_IN_TO_RATE_THIS_ANALYSIS ]
        </p>
      </div>
    );
  }

  return (
    <div className="pt-16 pb-8 border-t border-white/5 space-y-4">
      <div className="text-criterion opacity-20 text-[9px] tracking-widest">RATE_ARCHIVAL_ACCURACY</div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleRate("up")}
          className={`flex items-center gap-2 px-4 py-2 rounded border text-sm transition-all ${
            rating === "up"
              ? "border-white/40 text-white bg-white/10"
              : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/70"
          }`}
        >
          <ThumbsUp size={13} /> Accurate
        </button>
        <button
          onClick={() => handleRate("down")}
          className={`flex items-center gap-2 px-4 py-2 rounded border text-sm transition-all ${
            rating === "down"
              ? "border-red-500/40 text-red-400 bg-red-500/10"
              : "border-white/10 text-white/40 hover:border-red-500/30 hover:text-red-400/70"
          }`}
        >
          <ThumbsDown size={13} /> Inaccurate
        </button>
      </div>

      {showComment && (
        <div className="flex gap-3 items-start pt-2">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="What was inaccurate? (optional)"
            rows={2}
            className="flex-1 bg-white/5 border border-white/10 rounded px-4 py-2 text-sm text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20"
          />
          <button
            onClick={() => submitFeedback("down", comment)}
            className="mt-1 p-2 rounded border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all"
          >
            <Send size={13} />
          </button>
        </div>
      )}
    </div>
  );
}


// --- Main Component ---
export default function SummaryContent({ movieId, length }: SummaryContentProps) {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWarmingUp, setIsWarmingUp] = useState(true); // Phase 1: preamble
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();

  // Phase 1 typewriter runs while isWarmingUp is true
  const preamble = usePreambleTypewriter(isWarmingUp);

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moviename: titleWithYear, tmdb_id: parseInt(movieId) }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `API failed with status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";

        // Background Collection Sync for this User
        const syncEngagement = () => {
          if (user) {
            fetch(`${primaryApiUrl}/movies/collection/engage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clerk_id: user.id, tmdb_id: parseInt(movieId), type: 'summary' })
            }).catch(() => {});
          }
        };

        // Cached: JSON response
        if (contentType.includes("application/json")) {
          const data = await response.json();
          if (isMounted) {
            setIsWarmingUp(false); // End Phase 1
            setSummary(data.token || JSON.stringify(data));
            setIsLoading(false);
            syncEngagement();
          }
          return;
        }

        // Streaming: SSE
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is not readable");

        const decoder = new TextDecoder();
        let currentSummary = "";
        let firstTokenReceived = false;
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                if (isMounted) {
                   setIsLoading(false);
                   syncEngagement();
                }
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.token) {
                  if (!firstTokenReceived) {
                    // Phase 1 → Phase 2 handoff: kill the typewriter
                    firstTokenReceived = true;
                    if (isMounted) setIsWarmingUp(false);
                  }
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
          setIsWarmingUp(false);
        }
      }
    }

    streamSummary();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [movieId]);

  // Phase 1: Show typewriter preamble while backend works
  if (isWarmingUp) {
    return (
      <div className="py-20 flex flex-col gap-8">
        <div className="space-y-3">
          {preamble.split("\n").filter(Boolean).map((line, i) => (
            <div key={i} className="text-criterion opacity-30 text-[10px] tracking-[0.4em] uppercase font-mono">
              {line}
              {i === preamble.split("\n").filter(Boolean).length - 1 && (
                <span className="inline-block w-[2px] h-3 bg-white/50 ml-1 animate-pulse" />
              )}
            </div>
          ))}
        </div>
        <div className="w-24 h-px bg-white/5 animate-pulse" />
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
        <div className="flex gap-3 pt-8 pb-4">
          <div className="text-criterion opacity-10 animate-pulse">STREAMING_NARRATIVE_DATA...</div>
        </div>
      )}

      {!isLoading && summary && <FeedbackBar movieId={movieId} />}
    </div>
  );
}


