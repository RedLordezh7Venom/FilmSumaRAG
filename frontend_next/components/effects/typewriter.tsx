"use client"

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  italic?: boolean;
}

export function Typewriter({ 
  text, 
  speed = 15, 
  delay = 0, 
  className = "",
  italic = true 
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    setDisplayedText(""); 
    setComplete(false);
    
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setComplete(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, speed, delay]);

  return (
    <div className={`${className} ${italic ? 'italic' : ''}`}>
      {displayedText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "steps(2)" }}
        className={`inline-block w-[2px] h-[1em] bg-white translate-y-[2px] ml-[2px] ${complete ? 'hidden' : ''}`}
      />
    </div>
  );
}
