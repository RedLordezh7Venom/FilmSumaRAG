'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Clock,
  MessageSquare,
  ChevronRight,
  Shield,
  FileText
} from 'lucide-react';
import Link from 'next/link';

interface Thread {
  id: string;
  author: string;
  title: string;
  content: string;
  timestamp: string;
  replies: number;
  image?: string;
}

export default function GlobalForumPage() {
  const [threads, setThreads] = useState<Thread[]>([
    {
      id: '128374',
      author: 'CineAnon',
      title: 'The "Top" Debate: Final Resolution',
      content: 'I\'ve frame-stepped the 4K release. The children are wearing the exact same clothes as the dream sequences. The ring on Cobb\'s hand is the only real totem. When he enters the house at the end, he is NOT wearing the ring. He is in reality. Period.',
      timestamp: 'Today, 04:20 PM',
      replies: 156,
      image: '/inception_top.jpg'
    },
    {
      id: '128392',
      author: 'Vengeance_66',
      title: 'Is The Batman (2022) too dark?',
      content: 'Literally and figuratively. I can barely see the action in the hallway scene on my OLED. Is this the intended aesthetic or just poor mastering?',
      timestamp: 'Today, 02:45 PM',
      replies: 89
    },
    {
      id: '128410',
      author: 'Cooper_9',
      title: 'Tesseract Physics vs Reality',
      content: 'Kip Thorne said the math holds up, but the visual representation of 5D space is purely artistic. Does this break the scientific immersion for anyone else?',
      timestamp: 'Yesterday, 11:15 PM',
      replies: 342
    }
  ]);

  return (
    <div className="min-h-screen bg-[#1a1c1e] text-[#d1d5db] font-serif p-0 leading-normal">
      {/* Forum Header Banner */}
      <header className="bg-[#2d3238] border-b border-[#3e444b] p-6 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#e1e4e8] tracking-tight">FilmSuma boards /film/ - Discussion</h1>
            <div className="flex gap-4 text-[11px] font-sans text-[#a3a9b1]">
              <span className="hover:underline cursor-pointer">Catalog</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Rules</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Wiki</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Search</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="bg-[#3e444b] hover:bg-[#4a5159] text-white px-4 py-2 text-xs font-sans rounded border border-[#525a62] transition-colors">
              Post New Thread
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* The Forums Table (Web 1.0 Style) */}
        <div className="bg-[#24292e] border border-[#3e444b] rounded shadow-xl overflow-hidden">
          <div className="bg-[#2d3238] p-3 text-[11px] font-bold uppercase tracking-widest text-[#8b949e] flex border-b border-[#3e444b]">
            <div className="flex-1">Thread / Topic</div>
            <div className="w-32 text-center">Author</div>
            <div className="w-20 text-center">Replies</div>
            <div className="w-40 text-right">Last Post</div>
          </div>

          <div className="divide-y divide-[#3e444b]">
            {threads.map((thread) => (
              <div key={thread.id} className="p-4 hover:bg-[#2d3238] transition-colors flex items-start gap-4">
                <div className="w-10 h-10 bg-[#343942] rounded flex items-center justify-center text-[#586069] flex-shrink-0">
                  <FileText size={20} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#58a6ff] font-bold text-lg hover:underline cursor-pointer leading-tight mb-1">
                    {thread.title}
                  </h3>
                  <p className="text-[#8b949e] text-sm line-clamp-2 italic">
                    "{thread.content}"
                  </p>
                </div>

                <div className="w-32 text-center text-sm font-sans text-[#a3a9b1]">
                  {thread.author}
                </div>

                <div className="w-20 text-center font-sans">
                  <span className="px-2 py-1 bg-[#161b22] rounded text-xs text-[#58a6ff] border border-[#30363d]">
                    {thread.replies}
                  </span>
                </div>

                <div className="w-40 text-right font-sans text-xs text-[#6e7681]">
                  {thread.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Board Statistics Footer */}
        <footer className="mt-12 p-8 border-t border-[#30363d] space-y-4">
          <div className="flex items-center gap-2 text-xs text-[#8b949e] font-sans">
            <Shield size={14} />
            <span className="font-bold">Board Statistics:</span> 
            <span>Threads: 14,021</span>
            <span>•</span>
            <span>Posts: 298,401</span>
            <span>•</span>
            <span className="text-emerald-500">Online: 1,402</span>
          </div>
          <p className="text-[10px] text-[#484f58] font-sans italic">
            "Cinema is a mirror that can flatter or deform, a window that allows us to see ourselves."
          </p>
        </footer>
      </div>
    </div>
  );
}
