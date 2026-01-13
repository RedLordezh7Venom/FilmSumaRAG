"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Send, Loader2, Sparkles, MessageSquare, ShieldCheck, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"

interface DeepDivePageProps {
  params: { movieId: string }
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

type EmbeddingStatus = 'checking' | 'generating' | 'ready' | 'error';

export default function DeepDivePage({ params }: DeepDivePageProps) {
  const movieId = params.movieId;
  const router = useRouter();
  const [movieTitle, setMovieTitle] = useState("Loading Movie...");
  const [movieTitleWithYear, setMovieTitleWithYear] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatus>('checking');
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
        const fallbackApiUrl = "http://127.0.0.1:8000";
        const baseUrl = (fallbackApiUrl).replace(/\/$/, '');

        let checkUrl = `${baseUrl}/check_embeddings/${encodeURIComponent(movieTitleWithYear)}`;

        const checkResponse = await fetch(checkUrl);
        const checkData = await checkResponse.json();

        if (checkData.exists) {
          setEmbeddingStatus('ready');
          setMessages([
            { id: 1, text: `I've analyzed "${movieTitle}" in depth. What would you like to know about its hidden details, plot twists, or character motivations?`, sender: 'ai' }
          ]);
          connectWebSocket();
        } else {
          setEmbeddingStatus('generating');
          setMessages([
            { id: 1, text: `Synchronizing cinematic data for "${movieTitle}"... Processing screenplay and core metadata. This might take a moment.`, sender: 'ai' }
          ]);

          let generateUrl = `${primaryApiUrl || fallbackApiUrl}/generate_embeddings`;
          await fetch(generateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie: movieTitleWithYear }),
          });

          pollEmbeddingsStatus();
        }
      } catch (error) {
        console.error("Error checking embeddings:", error);
        setEmbeddingStatus('error');
        setMessages([
          { id: 1, text: `There was a disturbance in the data stream. Please reload to try again.`, sender: 'ai' }
        ]);
      }
    }

    checkAndGenerateEmbeddings();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [movieTitleWithYear, movieTitle]);

  async function pollEmbeddingsStatus() {
    const maxAttempts = 60;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
        const fallbackApiUrl = "http://127.0.0.1:8000";
        let checkUrl = `${primaryApiUrl || fallbackApiUrl}/check_embeddings/${encodeURIComponent(movieTitleWithYear)}`;

        const response = await fetch(checkUrl);
        const data = await response.json();

        if (data.exists) {
          clearInterval(interval);
          setEmbeddingStatus('ready');
          setMessages([
            { id: 1, text: `Deep Dive is now operational for "${movieTitle}". I'm ready for your questions.`, sender: 'ai' }
          ]);
          connectWebSocket();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setEmbeddingStatus('error');
        }
      } catch (error) {
        console.error("Error polling status:", error);
      }
    }, 5000);
  }

  function connectWebSocket() {
    try {
      const primaryApiUrl = "ws://127.0.0.1:8000";
      let wsUrl = primaryApiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      const ws = new WebSocket(`${wsUrl}/ws/chat/${encodeURIComponent(movieTitleWithYear)}`);

      ws.onopen = () => setIsConnected(true);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setIsSending(false);
        if (data.type === 'answer') {
          setMessages((prev) => [...prev, { id: Date.now(), text: data.answer, sender: 'ai' }]);
        }
      };
      ws.onerror = () => {
        setIsConnected(false);
        setIsSending(false);
      };
      ws.onclose = () => setIsConnected(false);
      wsRef.current = ws;
    } catch (e) {
      setIsConnected(false);
    }
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTo({ top: scrollElement.scrollHeight, behavior: "smooth" });
      }
    }
  }, [messages, isSending]);

  const handleSendMessage = () => {
    if (inputMessage.trim() === "" || !isConnected || isSending) return;
    const userMessageText = inputMessage;
    setInputMessage("");
    setIsSending(true);
    setMessages((prev) => [...prev, { id: Date.now(), text: userMessageText, sender: "user" }]);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ question: userMessageText }));
    } else {
      setIsSending(false);
      setIsConnected(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-50 selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Background Decor */}
      <div className="fixed -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/5 blur-[120px] rounded-full" />
      <div className="fixed -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />

      <div className="container mx-auto px-6 py-12 relative z-10 max-w-4xl h-screen flex flex-col">
        <div className="shrink-0 space-y-6 mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-slate-400 hover:text-white -ml-4 group">
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Movie Info
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-indigo-400 py-1 px-3 bg-indigo-500/10 rounded-full border border-indigo-500/20">Deep Dive Analysis</span>
                {isConnected && <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 py-1 px-3 bg-emerald-500/10 rounded-full border border-emerald-500/20"><ShieldCheck className="w-3 h-3" /> System Ready</span>}
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white line-clamp-1">
                {movieTitle}
              </h1>
            </div>
          </div>
        </div>

        <Card className="flex-1 min-h-0 bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col mb-8">
          <CardHeader className="border-b border-white/5 bg-white/5 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-xl">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Cinematic Intelligence</p>
                <div className="flex items-center gap-2">
                  {embeddingStatus !== 'ready' ? (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 animate-pulse">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      {embeddingStatus === 'checking' ? 'Validating Cache...' : 'Generating Neural Map...'}
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-emerald-500">Active Connection</p>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 min-h-0 overflow-hidden p-0 flex flex-col">
            <ScrollArea className="flex-1 p-6 md:p-8" ref={scrollAreaRef} scrollHideDelay={0}>
              <div className="space-y-6 max-w-2xl mx-auto">
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] px-5 py-4 rounded-2xl md:rounded-3xl shadow-lg leading-relaxed ${message.sender === 'user'
                          ? 'bg-indigo-500 text-white font-medium rounded-tr-none'
                          : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none backdrop-blur-md'
                        }`}>
                        {message.text}
                      </div>
                    </motion.div>
                  ))}
                  {isSending && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-none px-6 py-4 flex items-center gap-3">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 tracking-wider">Analyzing Plot...</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            <div className="p-6 md:p-8 bg-black/20 border-t border-white/5 space-y-4">
              {embeddingStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold mb-4">
                  <AlertCircle className="w-4 h-4" />
                  System interruption. Check backend or try another movie.
                </div>
              )}
              <div className="relative group">
                <Input
                  type="text"
                  placeholder={embeddingStatus === 'ready' ? "Decode this movie..." : "Warming up processor..."}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={embeddingStatus !== 'ready' || !isConnected || isSending}
                  className="bg-black/40 border-white/10 text-white placeholder:text-slate-600 h-16 px-6 pr-16 rounded-2xl focus:ring-indigo-500/50 transition-all shadow-inner"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={embeddingStatus !== 'ready' || !isConnected || isSending}
                  className="absolute right-2 top-2 bottom-2 w-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-0 transition-all"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-[10px] text-center font-bold text-slate-600 tracking-[0.15em] uppercase">Powered by Gemini · Vector RAG Technology</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

