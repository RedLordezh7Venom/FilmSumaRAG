"use client";

import { useState } from "react";
import { useUser, SignOutButton, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { 
  Library, 
  MessageSquare, 
  Bookmark, 
  ArrowRight,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const [pinned, setPinned] = useState(true);

  const NAV_ITEMS = [
    { label: "Archives", icon: Library, path: "/browse", shortcut: "01" },
    { label: "Discussions", icon: MessageSquare, path: "/boards", shortcut: "02" },
    { label: "Collection", icon: Bookmark, path: "/collection", shortcut: "03" },
    { label: "Deep Dives", icon: MonitorPlay, path: "/deep-dives", shortcut: "04" },
    // { label: "Video Essays", icon: Youtube, path: "/research", shortcut: "05" }, // Disabled — not in use
  ];

  return (
    <>
      {/* When unpinned: invisible hover zone at left edge to trigger sidebar */}
      {!pinned && (
        <div className="fixed left-0 top-0 h-screen w-5 z-[200] peer/trigger">
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-[3px] h-16 bg-white/15 rounded-full" />
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed left-0 top-0 h-screen w-72 border-r border-white/5 flex flex-col z-[150] selection:bg-white selection:text-black transition-transform duration-300 ease-out",
          pinned
            ? "translate-x-0 bg-white/[0.01]"
            : "-translate-x-full peer-hover/trigger:translate-x-0 hover:translate-x-0 bg-[#0b0f17]/95 backdrop-blur-xl shadow-2xl shadow-black/50",
        ].join(" ")}
      >
        <div className="p-12 space-y-24 flex flex-col h-full">
          
          {/* Top: Branding + Pin Toggle */}
          <div className="space-y-12">
              <div className="flex items-start justify-between">
                <Link href="/" className="group block">
                   <div className="text-criterion opacity-30 group-hover:opacity-100 transition-opacity mb-2">FilmSuma / Archive /</div>
                   <h1 className="text-4xl font-black italic tracking-tighter text-white leading-none">SUM-A-FILM</h1>
                </Link>
                <button
                  onClick={() => setPinned(!pinned)}
                  className="mt-1 p-2 rounded-lg hover:bg-white/5 text-white/20 hover:text-white transition-all"
                  title={pinned ? "Hide sidebar" : "Pin sidebar"}
                >
                  {pinned ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                </button>
              </div>

              <div className="pt-8 border-t border-white/5">
                  {isLoaded && user ? (
                      <div className="group flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <img src={user.imageUrl} className="w-8 h-8 rounded-full grayscale group-hover:grayscale-0 transition-all border border-white/10" alt="" />
                            <div>
                               <div className="text-criterion text-[9px] opacity-40">User Logged</div>
                               <div className="text-white font-serif italic text-sm">{user.firstName || 'Researcher'}</div>
                            </div>
                         </div>
                         <SignOutButton>
                            <button className="text-[9px] text-criterion opacity-20 hover:opacity-100 transition-opacity underline underline-offset-4 decoration-white/20">STOP</button>
                         </SignOutButton>
                      </div>
                  ) : (
                      <SignInButton mode="modal">
                        <button className="w-full bg-white text-black font-black text-[10px] tracking-widest uppercase py-4 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                          INITIATE_SESSION <ArrowRight size={12} />
                        </button>
                      </SignInButton>
                  )}
              </div>
          </div>

          {/* Mid: Primary Nav */}
          <nav className="flex-1 space-y-10 py-12">
             <div className="text-criterion opacity-20 text-[9px] mb-8">Primary_Navigator_Unit</div>
             <div className="space-y-6">
                {NAV_ITEMS.map((item) => (
                  <Link 
                    key={item.path} 
                    href={item.path}
                    className={`group flex items-center justify-between transition-all ${pathname === item.path ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`}
                  >
                    <div className="flex items-center gap-4">
                       <item.icon size={18} strokeWidth={1.5} className="text-white" />
                       <span className="text-criterion text-[11px] group-hover:tracking-[0.5em] transition-all">{item.label}</span>
                    </div>
                    <span className="text-[9px] font-mono text-white/10 group-hover:text-white/40 transition-colors">[{item.shortcut}]</span>
                  </Link>
                ))}
             </div>
          </nav>

          {/* Bottom: Footer */}
          <footer className="pt-12 border-t border-white/5 space-y-6">
             <div className="space-y-2">
                <div className="text-criterion opacity-10">System_V2_Stable</div>
                <div className="text-[9px] text-criterion opacity-30 leading-loose">
                   All narrative data is indexed via TMDB archives and semantic RAG vectoring. 
                </div>
             </div>
             <div className="text-[8px] text-criterion opacity-10 font-mono">
                © 2026 FilmSuma Laboratory
             </div>
          </footer>
        </div>
      </aside>

      {/* Spacer: reserves layout space only when sidebar is pinned */}
      {pinned && <div className="w-72 flex-shrink-0" />}
    </>
  );
}
