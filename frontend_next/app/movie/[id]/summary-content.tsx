'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Loader2, Play } from 'lucide-react';

export default function SummaryContent({ movie }: { movie: any }) {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
        const response = await fetch(`${primaryApiUrl}/summary/${movie.id}?length=1000`);
        const data = await response.json();
        setSummary(data.summary || "Summary generation in progress...");
      } catch (error) {
        console.error("Summary fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [movie.id]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
          <Sparkles size={20} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">AI Narrative Breakdown</h2>
      </div>

      <div className="prose prose-invert prose-slate max-w-none prose-p:text-slate-400 prose-p:leading-relaxed prose-headings:text-white prose-strong:text-white prose-blockquote:border-purple-500/50">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <div className="h-4 w-full bg-slate-800 animate-pulse rounded" />
            <div className="h-4 w-[90%] bg-slate-800 animate-pulse rounded" />
            <div className="h-4 w-[95%] bg-slate-800 animate-pulse rounded" />
            <div className="h-4 w-[70%] bg-slate-800 animate-pulse rounded" />
          </div>
        ) : (
          <ReactMarkdown>{summary}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}
