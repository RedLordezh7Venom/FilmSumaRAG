"use client"

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  italic?: boolean;
}

export function Typewriter({ 
  text, 
  speed = 10, 
  delay = 0, 
  className = "",
  italic = true 
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    // Basic safety check for server-side hydration
    if (typeof window === 'undefined') return;

    let isMounted = true;
    setDisplayedText(""); 
    setComplete(false);
    
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (!isMounted) return;
        
        setDisplayedText(text.slice(0, i + 1));
        i++;
        
        if (i >= text.length) {
          clearInterval(interval);
          setComplete(true);
        }
      }, speed);
      
      return () => {
        clearInterval(interval);
      };
    }, delay);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [text, speed, delay]);

  return (
    <div className={`${className} ${italic ? 'italic' : ''} inline`}>
      {displayedText}
      <AnimatePresence>
        {!complete && (
          <motion.span
            key="cursor"
            initial={{ opacity: 0 }}
            animate={{ opacity: [1, 1, 0, 0] }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.8, 
              repeat: Infinity, 
              times: [0, 0.5, 0.5, 1],
              ease: "linear"
            }}
            className="inline-block w-[6px] h-[1em] bg-white translate-y-[2px] ml-[2px]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
