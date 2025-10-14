"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

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
        // Check if embeddings exist
        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
        const fallbackApiUrl = "http://127.0.0.1:8000";
        
        let checkUrl = `${primaryApiUrl || fallbackApiUrl}/check_embeddings/${encodeURIComponent(movieTitleWithYear)}`;
        
        const checkResponse = await fetch(checkUrl);
        const checkData = await checkResponse.json();

        if (checkData.exists) {
          setEmbeddingStatus('ready');
          setMessages([
            { id: 1, text: `Hello! I'm your Deep Dive AI for "${movieTitle}". Ask me anything about the movie!`, sender: 'ai' }
          ]);
          connectWebSocket();
        } else {
          // Start generating embeddings
          setEmbeddingStatus('generating');
          setMessages([
            { id: 1, text: `Preparing Deep Dive for "${movieTitle}"... Downloading and processing subtitles to create embeddings. This may take a minute.`, sender: 'ai' }
          ]);

          let generateUrl = `${primaryApiUrl || fallbackApiUrl}/generate_embeddings`;
          await fetch(generateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ movie: movieTitleWithYear }),
          });

          // Poll for completion
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

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [movieTitleWithYear, movieTitle]);

  async function pollEmbeddingsStatus() {
    const maxAttempts = 60; // 5 minutes (60 * 5 seconds)
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
            { id: 1, text: `Deep Dive is ready for "${movieTitle}"! Ask me anything about the movie.`, sender: 'ai' }
          ]);
          connectWebSocket();
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
    }, 5000); // Check every 5 seconds
  }

  function connectWebSocket() {
    try {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
      const fallbackApiUrl = "ws://127.0.0.1:8000";
      
      // Convert HTTP(S) to WS(S)
      let wsUrl = fallbackApiUrl;
      if (primaryApiUrl) {
        wsUrl = primaryApiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      }
      
      const ws = new WebSocket(`${wsUrl}/ws/chat/${encodeURIComponent(movieTitleWithYear)}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setIsSending(false);
        
        if (data.type === 'answer') {
          setMessages((prev) => [
            ...prev,
            { id: prev.length + 1, text: data.answer, sender: 'ai' }
          ]);
        } else if (data.type === 'error') {
          setMessages((prev) => [
            ...prev,
            { id: prev.length + 1, text: `Error: ${data.message}`, sender: 'ai' }
          ]);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        setIsSending(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      setIsConnected(false);
    }
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "" || !isConnected || isSending) return;

    const userMessageText = inputMessage;
    setInputMessage("");
    setIsSending(true);

    setMessages((prevMessages) => [
      ...prevMessages,
      { id: prevMessages.length + 1, text: userMessageText, sender: "user" }
    ]);

    // Send question via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ question: userMessageText }));
    } else {
      setIsSending(false);
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: prevMessages.length + 1, text: "Connection lost. Please refresh the page.", sender: "ai" }
      ]);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" passHref>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Movie Info
          </Button>
        </Link>

        <Card className="bg-black/30 backdrop-blur-sm border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              Deep Dive: {movieTitle}
            </CardTitle>
            {embeddingStatus !== 'ready' && (
              <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                {embeddingStatus === 'checking' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking embeddings...</span>
                  </>
                )}
                {embeddingStatus === 'generating' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating embeddings from subtitles... This may take a minute.</span>
                  </>
                )}
                {embeddingStatus === 'error' && (
                  <span className="text-red-400">Error loading Deep Dive</span>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <ScrollArea className="h-[400px] pr-4 mb-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="max-w-[70%] p-3 rounded-lg bg-gray-700 text-white flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={embeddingStatus === 'ready' ? "Ask me anything about this movie..." : "Please wait..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && embeddingStatus === 'ready') {
                    handleSendMessage();
                  }
                }}
                disabled={embeddingStatus !== 'ready' || !isConnected || isSending}
                className="flex-1 bg-white/10 text-white placeholder:text-gray-400 border-2 border-transparent focus:border-indigo-500 transition-all disabled:opacity-50"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={embeddingStatus !== 'ready' || !isConnected || isSending}
                className="bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-semibold disabled:opacity-50"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
