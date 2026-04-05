'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  MessageSquare, 
  User, 
  Hash, 
  Shield, 
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface Reply {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isOp?: boolean;
}

interface ThreadPost {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  replies: Reply[];
}

export default function MovieDiscussionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [movieTitle, setMovieTitle] = useState("Loading Movie...");
  const [posts, setPosts] = useState<ThreadPost[]>([]);

  useEffect(() => {
    // Fetch Movie Title
    const fetchTitle = async () => {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
      const data = await res.json();
      setMovieTitle(data.title || "Unknown Movie");
    };
    fetchTitle();

    // Mocking a 4chan-style thread structure
    setPosts([
      {
        id: '10928374',
        author: 'Anonymous',
        content: `I've been analyzing the ending for hours. If the top actually is the totem, then the entire movie is a loop. But look at the children's shoes. They are different in the final scene. COBB IS NOT DREAMING.`,
        timestamp: '01/25/26 (Sun) 07:18:34',
        replies: [
          { id: '10928388', author: 'Anonymous', content: '>>>10928374\nDelusional. The shoes are exactly the same. Check the HD screenshots.', timestamp: '01/25/26 (Sun) 07:22:15' },
          { id: '10928394', author: 'Cine-Sage', content: '>>>10928374\nOP is right about the logic, but wrong about the importance. Nolan himself said it doesn\'t matter. Cobb doesn\'t look at the top. That\'s the point.', timestamp: '01/25/26 (Sun) 07:25:01' }
        ]
      },
      {
        id: '10928410',
        author: 'Anonymous',
        content: `Anyone else notice how the music slows down when they go deeper? It's literally just the Edith Piaf song slowed down to match the time dilation. Absolute kino.`,
        timestamp: '01/25/26 (Sun) 08:30:11',
        replies: []
      }
    ]);
  }, [id]);

  return (
    <div className="min-h-screen bg-[#030712] text-[#d1d5db] font-mono p-8 pt-24 pb-20 selection:bg-slate-700 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header Section */}
        <header className="border-b border-slate-800 pb-8 flex justify-between items-end">
          <div className="space-y-4">
            <Link href={`/movies/${id}`} className="flex items-center gap-2 text-slate-600 hover:text-white transition-colors">
              <ArrowLeft size={16} /> <span className="text-xs uppercase tracking-widest font-bold">Back to Dashboard</span>
            </Link>
            <h1 className="text-4xl font-bold tracking-tighter text-white uppercase italic">
              /{id}/ - {movieTitle.replace(/\s+/g, '_').toLowerCase()}
            </h1>
            <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-700">
              <span className="flex items-center gap-1"><Shield size={10} /> MODS ONLINE</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {posts.length} ACTIVE THREADS</span>
            </div>
          </div>
          <button className="px-6 py-3 bg-[#1e293b] border border-slate-700 text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-slate-700 transition-all">
            [ Start New Thread ]
          </button>
        </header>

        {/* 4chan Style Thread List */}
        <div className="space-y-16">
          {posts.map((post) => (
            <div key={post.id} className="space-y-4">
              {/* Original Post (OP) */}
              <div className="p-6 bg-[#0d1117] border-l-4 border-slate-700 flex gap-6 group">
                <div className="flex-shrink-0 w-12 h-12 bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-800 group-hover:text-slate-600 transition-colors">
                  <User size={24} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className="text-emerald-600 uppercase italic underline cursor-pointer">Anonymous</span>
                    <span className="text-slate-700">{post.timestamp}</span>
                    <span className="text-slate-500 cursor-pointer hover:text-white transition-colors">No.{post.id}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {post.content}
                  </p>
                </div>
              </div>

              {/* Replies */}
              <div className="pl-12 space-y-4">
                {post.replies.map((reply) => (
                  <div key={reply.id} className="p-4 bg-[#0d1117]/60 border border-slate-800 rounded-lg flex gap-4 w-fit max-w-[80%] hover:border-slate-600 transition-all">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <span className="text-blue-600 uppercase italic">Anonymous</span>
                        <span className="text-slate-800">{reply.timestamp}</span>
                        <span className="text-slate-700">No.{reply.id}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-400 whitespace-pre-wrap">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Board Footer */}
        <footer className="pt-20 border-t border-slate-900 text-center space-y-4">
          <p className="text-[10px] text-slate-800 font-bold tracking-[0.5em] uppercase">Discourse is user-generated content. Proceed with caution.</p>
          <div className="flex justify-center gap-8 text-[10px] font-bold text-slate-700">
             <span>[0]</span> <span>[1]</span> <span>[2]</span> <span>[3]</span> <span>[4]</span> <span>[5]</span> <span>[6]</span> <span>[7]</span> <span>[8]</span> <span>[9]</span> 
          </div>
        </footer>
      </div>
    </div>
  );
}
