"use client"

import { useState, useEffect, use } from "react"
import { MessageSquare, ArrowLeft, Send, User, Quote, ShieldAlert, Plus, MessageCircle } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

interface ForumPost {
  id: number;
  post_number: string;
  title: string;
  content: string;
  created_at: string;
  user_id?: number;
}

export default function MovieDiscussionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [movieTitle, setMovieTitle] = useState("Narrative_Context");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    const fetchMovieAndPosts = async () => {
      try {
        const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`);
        const movieData = await movieResponse.json();
        setMovieTitle(movieData.title.toUpperCase());

        const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
        // Correct endpoint according to discussions.py
        const postResponse = await fetch(`${primaryApiUrl}/discussions/boards/${id}/posts`);
        const postData = await postResponse.json();
        
        // Ensure posts is always an array
        setPosts(Array.isArray(postData) ? postData : []);
      } catch (err) {
        console.error("Board error:", err);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMovieAndPosts();
  }, [id]);

  const handlePost = async () => {
    if (!newPostContent.trim() || !newPostTitle.trim()) return;
    try {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${primaryApiUrl}/discussions/boards/${id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: newPostTitle,
          content: newPostContent,
          clerk_id: null
        })
      });
      if (response.ok) {
        const createdPost = await response.json();
        setPosts(prev => [createdPost, ...prev]);
        setNewPostContent("");
        setNewPostTitle("");
        setShowForm(false);
      }
    } catch (err) {
      console.error("Post error:", err);
    }
  };

  const handleReply = async (postId: number) => {
    if (!replyContent.trim()) return;
    try {
      const primaryApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${primaryApiUrl}/discussions/threads/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: replyContent,
          clerk_id: null
        })
      });
      if (response.ok) {
        // Ideally we'd map this reply into the local state, but for now just close the box
        // To be fully reactive we handle it gracefully:
        setReplyingTo(null);
        setReplyContent("");
      }
    } catch (err) {
      console.error("Reply error:", err);
    }
  };

  return (
    <div className="cinematic-canvas p-20 font-sans selection:bg-white selection:text-black">
      <div className="film-grain" />

      <div className="max-w-6xl mx-auto space-y-20 relative z-10">
        
        {/* Board Header - 4chan Style Ledger */}
        <header className="flex items-end justify-between border-b border-white/10 pb-16">
           <div className="space-y-6">
              <Link href={`/movie/${id}`} className="text-criterion opacity-30 hover:opacity-100 transition-opacity flex items-center gap-3">
                 <ArrowLeft size={14} /> [ RETURN_TO_ARCHIVE ]
              </Link>
              <h1 className="text-8xl font-black italic tracking-tighter text-white leading-none">
                /{id}/ - {movieTitle}
              </h1>
              <div className="flex gap-8 text-[9px] text-criterion opacity-20">
                 <div>BOARD_SYNCHRONIZED: ACTIVE</div>
                 <div>ANONYMITY: ENABLED</div>
                 <div className="text-white hover:underline cursor-pointer" onClick={() => setShowForm(!showForm)}>
                    [ {showForm ? 'CANCEL_POST' : 'START_NEW_THREAD'} ]
                 </div>
              </div>
           </div>
        </header>

        {/* New Post Form - 4chan Style Compact */}
        <AnimatePresence>
          {showForm && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-10 glass-surface rounded-[2rem] border border-white/10 space-y-6 bg-white/[0.02]">
                 <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="SUBJECT_TOPIC..."
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 py-4 text-white font-serif italic text-2xl outline-none focus:border-white transition-all"
                    />
                    <textarea 
                      placeholder="CONSTRUCT_ARCHIVE_INPUT..."
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      rows={6}
                      className="w-full bg-transparent text-white font-serif italic text-xl outline-none resize-none no-scrollbar"
                    />
                 </div>
                 <div className="flex justify-end">
                    <button 
                      onClick={handlePost}
                      className="bg-white text-black font-black text-[10px] tracking-widest px-12 py-4 rounded-xl hover:bg-slate-200 transition-all uppercase"
                    >
                      POST_TO_BOARD
                    </button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thread Ledger - 4chan Style High Density */}
        <div className="space-y-12">
           {loading ? (
              <div className="p-20 text-center text-criterion opacity-20 animate-pulse">SYNCHRONIZING_BOARD_DATA...</div>
           ) : posts.length === 0 ? (
             <div className="p-20 text-center border border-white/5 bg-white/[0.01] rounded-[2rem] space-y-6">
                <Quote size={40} className="mx-auto text-white/10" />
                <div className="text-criterion opacity-20">EMPTY_ARCHIVE</div>
                <p className="text-slate-500 font-serif italic text-lg">No collective signatures found. Initiate the first thread.</p>
             </div>
           ) : (
             <div className="divide-y divide-white/[0.03]">
                {posts.map((post) => (
                  <div key={post.id} className="py-12 group">
                     {/* 4chan Metadata Style */}
                     <div className="flex items-center gap-4 text-[10px] text-criterion mb-6">
                        <span className="text-white font-black italic">Anonymous</span>
                        <span className="opacity-20">{new Date(post.created_at).toLocaleString()}</span>
                        <span className="text-white/40 hover:underline cursor-pointer">{post.post_number}</span>
                        <span 
                          onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)} 
                          className="opacity-10 group-hover:opacity-100 transition-opacity ml-auto hover:text-white cursor-pointer"
                        >
                          [ REPLY ]
                        </span>
                     </div>
                     
                     <div className="space-y-6">
                        <h3 className="text-4xl font-black italic tracking-tighter text-white">
                           {post.title}
                        </h3>
                        <p className="text-xl text-slate-400 font-serif italic leading-relaxed max-w-4xl">
                           {post.content}
                        </p>
                     </div>

                     <AnimatePresence>
                       {replyingTo === post.id && (
                         <motion.div 
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           className="overflow-hidden mt-6"
                         >
                            <div className="pl-8 border-l border-white/10 space-y-4">
                               <textarea 
                                 placeholder="COMPOSE_REPLY..."
                                 value={replyContent}
                                 onChange={(e) => setReplyContent(e.target.value)}
                                 className="w-full bg-white/[0.02] border border-white/5 p-4 rounded-xl text-white font-serif italic outline-none resize-none no-scrollbar focus:border-white/20 transition-all"
                                 rows={3}
                               />
                               <div className="flex justify-end">
                                  <button 
                                    onClick={() => handleReply(post.id)}
                                    className="bg-white/10 text-white hover:bg-white hover:text-black font-black text-[10px] tracking-widest px-8 py-3 rounded-lg transition-all"
                                  >
                                    SUBMIT
                                  </button>
                               </div>
                            </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                  </div>
                ))}
             </div>
           )}
        </div>

      </div>
    </div>
  )
}
