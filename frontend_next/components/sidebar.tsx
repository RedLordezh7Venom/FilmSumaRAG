"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Film, 
  MessageSquare, 
  History,
  LayoutGrid,
  LogIn
} from "lucide-react";
import Link from "next/link";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";

const RecentDeepDive = ({ title, date }: { title: string; date: string }) => (
  <Link href="#" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-purple-400 transition-all">
      <Film size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-400 group-hover:text-slate-100 truncate transition-colors">{title}</p>
      <p className="text-xs text-slate-600 group-hover:text-slate-500 transition-colors">{date}</p>
    </div>
  </Link>
);

export const Sidebar = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="fixed left-0 top-0 h-full z-[100] flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sidebar Content */}
      <motion.div
        initial={false}
        animate={{ width: isHovered ? 280 : 80 }}
        className="h-full glass border-r border-white/5 flex flex-col items-stretch overflow-hidden relative shadow-2xl"
      >
        {/* Logo/Header */}
        <div className="p-6 flex items-center gap-4 cursor-default group/logo">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex-shrink-0 flex items-center justify-center group-hover/logo:bg-gradient-to-br group-hover/logo:from-purple-500 group-hover/logo:to-pink-500 transition-all duration-300">
            <Film className="text-slate-400 group-hover/logo:text-white" size={18} />
          </div>
          <AnimatePresence>
            {isHovered && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-xl tracking-tighter transition-all duration-300 text-slate-400 group-hover/logo:bg-clip-text group-hover/logo:text-transparent group-hover/logo:bg-gradient-to-r group-hover/logo:from-purple-500 group-hover/logo:to-pink-500 whitespace-nowrap"
              >
                Sum-A-Film
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { icon: LayoutGrid, label: "Browse", href: "/browse" },
            { icon: MessageSquare, label: "Discussions", href: "/discussions" },
            { icon: History, label: "Recent Dives", href: "#" },
          ].map((item, index) => (
            <Link key={index} href={item.href} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group">
              <item.icon className="text-slate-500 group-hover:text-purple-400 transition-colors" size={20} />
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-slate-400 group-hover:text-slate-100 font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          ))}

          {/* Recent List - Only visible when expanded */}
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 pt-8 border-t border-white/5"
            >
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-4">
                Recent Analysis
              </p>
              <div className="space-y-1">
                <RecentDeepDive title="Inception" date="2 hours ago" />
                <RecentDeepDive title="The Dark Knight" date="Yesterday" />
              </div>
            </motion.div>
          )}
        </nav>

        {/* Footer/User Profile */}
        <div className="p-4 mt-auto border-t border-white/5">
          <SignedIn>
            <div className="flex items-center gap-4 p-2 rounded-xl hover:bg-white/5 transition-all group cursor-pointer overflow-hidden">
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8 rounded-full border border-white/10"
                  }
                }}
              />
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-medium text-slate-400 group-hover:text-slate-200 truncate">Account</p>
                    <p className="text-xs text-slate-600 truncate transition-colors">Manage Profile</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SignedIn>
          
          <SignedOut>
            <SignInButton mode="modal">
              <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group cursor-pointer text-slate-400 hover:text-slate-100">
                <LogIn size={20} className="group-hover:text-purple-400 transition-colors" />
                <AnimatePresence>
                  {isHovered && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      Sign In
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </SignInButton>
          </SignedOut>
        </div>
      </motion.div>
    </div>
  );
};
