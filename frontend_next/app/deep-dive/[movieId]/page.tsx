"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Send } from "lucide-react"
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

export default function DeepDivePage({ params }: DeepDivePageProps) {
  const movieId = params.movieId;
  const router = useRouter();
  const [movieTitle, setMovieTitle] = useState("Loading Movie...");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
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
          setMessages([
            { id: 1, text: `Hello! I'm your Deep Dive AI for "${data.title}". What would you like to know?`, sender: 'ai' }
          ]);
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
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "") return;

    const newUserMessage = { id: messages.length + 1, text: inputMessage, sender: "user" };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputMessage("");

    const res = await fetch("http://localhost:8000/deep_dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movie: movieTitle, question: inputMessage }),
    });

    const data = await res.json();
    const newAiMessage = {
        id: messages.length + 2,
        text: data.response || "Embeddings still being prepared, try again in a few seconds.",
        sender: "ai",
    };
    setMessages((prev) => [...prev, newAiMessage]);
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
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ask me anything about this movie..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
                className="flex-1 bg-white/10 text-white placeholder:text-gray-400 border-2 border-transparent focus:border-indigo-500 transition-all"
              />
              <Button onClick={handleSendMessage} className="bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-semibold">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
