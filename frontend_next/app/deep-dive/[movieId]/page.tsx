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
            { id: 1, text: `Hello! I'm your Deep Dive AI for "${movieTitle}". Ask me anything about the movie!`, sender: 'ai' }
          ]);
        } else {
          setEmbeddingStatus('generating');
          setMessages([
            { id: 1, text: `Preparing Deep Dive for "${movieTitle}"... Downloading and processing subtitles to create embeddings. This may take a minute.`, sender: 'ai' }
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
          { id: 1, text: `Sorry, there was an error preparing the Deep Dive. Please try again later.`, sender: 'ai' }
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
            { id: 1, text: `Deep Dive is ready for "${movieTitle}"! Ask me anything about the movie.`, sender: 'ai' }
          ]);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setEmbeddingStatus('error');
          setMessages([
            { id: 1, text: `Sorry, embeddings generation took too long. Please try again later.`, sender: 'ai' }
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
        { id: prev.length + 1, text: `Error: ${error.message || "Failed to get response"}`, sender: "ai" }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href={`/summary/${movieId}`} passHref>
          <Button variant="ghost" className="mb-6 hover:bg-white/10">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Summary
          </Button>
        </Link>

        <Card className="bg-black/40 backdrop-blur-md border-white/10 shadow-2xl overflow-hidden ring-1 ring-white/5">
          <CardHeader className="border-b border-white/10 bg-white/5">
            <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Deep Dive: {movieTitle}
            </CardTitle>
            {embeddingStatus !== 'ready' && (
              <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                {embeddingStatus === 'checking' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span>Checking knowledge base...</span>
                  </>
                )}
                {embeddingStatus === 'generating' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span>Processing subtitles... This may take a minute.</span>
                  </>
                )}
                {embeddingStatus === 'error' && (
                  <span className="text-red-400">Error loading knowledge base</span>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px] p-6" ref={scrollAreaRef}>
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl shadow-lg ${message.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'
                        }`}
                    >
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </div>
                      {message.sender === 'ai' && message.text === "" && (
                        <div className="flex gap-1 py-1">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isSending && messages[messages.length - 1]?.sender === 'user' && (
                  <div className="flex justify-start">
                    <div className="max-w-[75%] p-4 rounded-2xl rounded-tl-none bg-white/10 text-gray-100 border border-white/5 shadow-lg flex items-center gap-3">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                      </div>
                      <span className="text-sm text-gray-400">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-6 bg-white/5 border-t border-white/10">
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder={embeddingStatus === 'ready' ? "Ask me anything about this movie..." : "Preparing..."}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  disabled={embeddingStatus !== 'ready' || isSending}
                  className="flex-1 bg-white/5 text-white placeholder:text-gray-500 border-white/10 focus:border-blue-500 focus:ring-blue-500 transition-all rounded-xl h-12"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={embeddingStatus !== 'ready' || isSending || !inputMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-6 h-12 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

