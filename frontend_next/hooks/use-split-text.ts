'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export interface SplitTextOptions {
  type?: 'chars' | 'words' | 'lines';
  autoAnimate?: boolean;
  animationDuration?: number;
  animationStagger?: number;
  animationDelay?: number;
}

export function useSplitText(options: SplitTextOptions = {}) {
  const elementRef = useRef<HTMLElement>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);

  const splitText = () => {
    const element = elementRef.current;
    if (!element) return [];

    const text = element.textContent || '';
    const type = options.type || 'chars';
    element.textContent = '';

    const chars: HTMLSpanElement[] = [];
    if (type === 'chars') {
      for (let char of text) {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.display = 'inline-block';
        element.appendChild(span);
        chars.push(span);
      }
    } else if (type === 'words') {
      const words = text.split(' ');
      words.forEach((word, idx) => {
        const span = document.createElement('span');
        span.textContent = word;
        span.style.display = 'inline-block';
        span.style.marginRight = '0.25em';
        element.appendChild(span);
        chars.push(span);
        if (idx < words.length - 1) {
          const space = document.createTextNode(' ');
          element.appendChild(space);
        }
      });
    }

    charsRef.current = chars;
    return chars;
  };

  const animateIn = (duration?: number, stagger?: number, delay?: number) => {
    const chars = charsRef.current;
    if (chars.length === 0) return;

    return gsap.from(chars, {
      duration: duration || options.animationDuration || 0.4,
      opacity: 0,
      y: 10,
      stagger: stagger || options.animationStagger || 0.03,
      delay: delay || options.animationDelay || 0,
      ease: 'back.out',
    });
  };

  useEffect(() => {
    const chars = splitText();
    if (options.autoAnimate && chars.length > 0) {
      animateIn();
    }
  }, []);

  return { elementRef, splitText, animateIn, chars: charsRef };
}
