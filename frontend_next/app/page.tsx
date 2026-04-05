"use client";

import { motion } from "framer-motion";
import { Film, ArrowRight, Play, Info } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-slate-400 text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            AI-Powered Movie Insights
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white mb-6">
            Explore Films <br />
            With <span className="text-gradient">Sum-A-Film</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Revolutionize your cinematic journey. Get instant AI summaries, deep dives into complex themes, and Join a community of film enthusiasts.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 pt-8">
            <Link href="/browse" className="bg-white text-slate-950 font-bold px-8 py-4 rounded-2xl hover:bg-slate-200 transition-all flex items-center gap-3 active:scale-95 group">
              <Play size={20} className="fill-current" />
              Start Browsing
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/discussions" className="glass px-8 py-4 rounded-2xl hover:bg-white/5 transition-all flex items-center gap-2 active:scale-95 text-slate-200 font-bold border border-white/10">
              <Info size={20} />
              View Discussions
            </Link>
          </div>
        </motion.div>

        {/* Feature Preview Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32">
          {[
            { 
              title: "AI Summaries", 
              desc: "Get the essence of any film in seconds with our advanced RAG agents.",
              icon: Film,
              color: "from-purple-500/20"
            },
            { 
              title: "Deep Dives", 
              desc: "Interactive NotebookLM-style analysis of transcripts and metadata.",
              icon: Info,
              color: "from-pink-500/20"
            },
            { 
              title: "Community", 
              desc: "Join a vibrant network of film buffs and share your insights.",
              icon: Play,
              color: "from-indigo-500/20"
            }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`p-8 glass-card border border-white/5 bg-gradient-to-br ${item.color} to-transparent group hover:border-white/10`}
            >
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <item.icon className="text-slate-200" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
