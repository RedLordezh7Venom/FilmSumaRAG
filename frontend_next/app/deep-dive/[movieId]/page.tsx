"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from 'react-markdown';


interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

type EmbeddingStatus = 'checking' | 'generating' | 'ready' | 'error';

export default function DeepDivePage() {
  const params = useParams();
  const movieId = params.movieId as string;
  const router = useRouter();
  const [movieTitle, setMovieTitle] = useState("Loading Movie...");
  const [movieTitleWithYear, setMovieTitleWithYear] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatus>('checking');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchMovieTitle() {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );
        const data = await response.json();
        if (data.title) {
          setMovieTitle(data.title);
          const releaseYear = data.release_date ? data.release_date.split('-')[0] : 'Unknown';
          const titleWithYear = `${data.title} (${releaseYear})`;
          setMovieTitleWithYear(titleWithYear);
        } else {
          setMovieTitle("Unknown Movie");
        }
      } catch (error) {
        console.error("Error fetching movie title:", error);
        setMovieTitle("Error loading movie");
      }
    }
    fetchMovieTitle();
  }, [movieId]);

  useEffect(() => {
    if (!movieTitleWithYear) return;

    async function checkAndGenerateEmbeddings() {
      try {
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
        const baseUrl = primaryApiUrl.replace(/\/$/, '');

        let checkUrl = `${baseUrl}/check_embeddings/${encodeURIComponent(movieTitleWithYear)}`;

        const checkResponse = await fetch(checkUrl);
        const checkData = await checkResponse.json();

        if (checkData.exists) {
          setEmbeddingStatus('ready');
          setMessages([
            { id: 1, text: `🎬 **Analysis Complete.** I've mapped out the narrative DNA of **${movieTitle}**. What secrets shall we uncover?`, sender: 'ai' }
          ]);
        } else {
          setEmbeddingStatus('generating');
          setMessages([
            { id: 1, text: `🔍 **Initializing Deep Dive...** I'm currently processing the screenplay for **${movieTitle}**. Hang tight, this is where the magic happens.`, sender: 'ai' }
          ]);

          let generateUrl = `${baseUrl}/generate_embeddings`;
          await fetch(generateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ movie: movieTitleWithYear }),
          });

          pollEmbeddingsStatus();
        }
      } catch (error) {
        console.error("Error checking embeddings:", error);
        setEmbeddingStatus('error');
        setMessages([
          { id: 1, text: `⚠️ **System Failure.** My cinematic database is currently offline. Please try again soon.`, sender: 'ai' }
        ]);
      }
    }

    checkAndGenerateEmbeddings();
  }, [movieTitleWithYear, movieTitle]);

  async function pollEmbeddingsStatus() {
    const maxAttempts = 60;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
        let checkUrl = `${primaryApiUrl}/check_embeddings/${encodeURIComponent(movieTitleWithYear)}`;

        const response = await fetch(checkUrl);
        const data = await response.json();

        if (data.exists) {
          clearInterval(interval);
          setEmbeddingStatus('ready');
          setMessages([
            { id: 1, text: `🚀 **Ready for Takeoff.** The Deep Dive for **${movieTitle}** is online. Ask me anything about the subtext, dialogue, or plot!`, sender: 'ai' }
          ]);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setEmbeddingStatus('error');
          setMessages([
            { id: 1, text: `⌛ **Processing Timeout.** This movie script is massive! Let's try again in a moment.`, sender: 'ai' }
          ]);
        }
      } catch (error) {
        console.error("Error polling embeddings status:", error);
      }
    }, 5000);
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages, isSending]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "" || embeddingStatus !== 'ready' || isSending) return;

    const userMessageText = inputMessage;
    const userMessageId = messages.length + 1;
    const aiMessageId = messages.length + 2;

    setInputMessage("");
    setIsSending(true);

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, text: userMessageText, sender: "user" },
      { id: aiMessageId, text: "", sender: "ai" }
    ]);

    try {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";

      const response = await fetch(`${primaryApiUrl}/deep_dive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movie: movieTitleWithYear,
          question: userMessageText
        })
      });

      if (!response.ok) {
        throw new Error(`API failed with status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;

            try {
              const data = JSON.parse(dataStr);
              if (data.token) {
                accumulatedText += data.token;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg
                  )
                );
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e, dataStr);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error in deep dive chat:", error);
      setMessages((prev) => [
        ...prev.filter(m => m.id !== aiMessageId),
        { id: prev.length + 1, text: `⚠️ **System Error:** ${error.message || "Failed to reach cinematic servers"}`, sender: "ai" }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 relative overflow-hidden">
      {/* Cinematic background effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.1),transparent)] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <Link href={`/summary/${movieId}`} passHref>
          <Button variant="ghost" className="mb-6 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Summary
          </Button>
        </Link>

        <Card className="bg-slate-900/40 backdrop-blur-xl border-white/5 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
          <CardHeader className="border-b border-white/10 bg-white/5 py-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  DEEP DIVE
                </CardTitle>
                <p className="text-gray-400 text-sm font-medium mt-1">Analyzing: {movieTitle}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${embeddingStatus === 'ready' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                embeddingStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                }`}>
                {embeddingStatus === 'ready' ? 'Online' : embeddingStatus === 'error' ? 'Offline' : 'Syncing'}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[550px]" ref={scrollAreaRef}>
              <div className="p-6 space-y-8">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[80%] p-5 rounded-3xl ${message.sender === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none shadow-lg shadow-blue-900/20'
                        : 'bg-white/5 border border-white/10 text-gray-100 rounded-tl-none backdrop-blur-sm'
                        }`}
                    >
                      <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </div>
                      {message.sender === 'ai' && message.text === "" && (
                        <div className="flex gap-2 py-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isSending && messages[messages.length - 1]?.sender === 'user' && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-5 rounded-3xl rounded-tl-none bg-white/5 border border-white/10 text-gray-400 flex items-center gap-3 italic">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      Deconstructing cinema...
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-6 bg-white/5 border-t border-white/10">
              <div className="relative group">
                <input
                  type="text"
                  placeholder={embeddingStatus === 'ready' ? "Ask the expert about this film..." : "System synchronizing..."}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  disabled={embeddingStatus !== 'ready' || isSending}
                  className="w-full bg-black/40 text-white placeholder:text-gray-500 border border-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all rounded-2xl h-14 pl-6 pr-16 outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={embeddingStatus !== 'ready' || isSending || !inputMessage.trim()}
                  className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-3 text-center uppercase tracking-widest font-bold opacity-50">
                Driven by FilmSuma RAG Core
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

