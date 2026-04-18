'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface SplitTextProps {
  children: string;
  className?: string;
  type?: 'chars' | 'words' | 'lines';
  duration?: number;
  stagger?: number;
  delay?: number;
  trigger?: boolean;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  onAnimationComplete?: () => void;
}

export const SplitText = React.forwardRef<HTMLDivElement, SplitTextProps>(
  (
    {
      children,
      className = '',
      type = 'chars',
      duration = 0.4,
      stagger = 0.03,
      delay = 0,
      trigger: useTrigger = false,
      start = 'top center',
      end = 'bottom center',
      scrub = false,
      onAnimationComplete,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const spansRef = useRef<HTMLSpanElement[]>([]);

    useEffect(() => {
      const container = ref ? (typeof ref === 'object' ? ref.current : null) : containerRef.current;
      if (!container) return;

      // Clear previous spans
      spansRef.current = [];
      container.textContent = '';

      // Split text into spans
      if (type === 'chars') {
        for (let char of children) {
          const span = document.createElement('span');
          span.textContent = char;
          span.style.display = 'inline-block';
          span.style.position = 'relative';
          container.appendChild(span);
          spansRef.current.push(span);
        }
      } else if (type === 'words') {
        const words = children.split(' ');
        words.forEach((word, idx) => {
          const span = document.createElement('span');
          span.textContent = word;
          span.style.display = 'inline-block';
          span.style.marginRight = '0.25em';
          span.style.position = 'relative';
          container.appendChild(span);
          spansRef.current.push(span);
        });
      }

      // Animate in
      const animationConfig: any = {
        duration,
        opacity: 0,
        y: 10,
        stagger,
        delay,
        ease: 'back.out',
        onComplete: onAnimationComplete,
      };

      if (useTrigger) {
        animationConfig.scrollTrigger = {
          trigger: container,
          start,
          end,
          scrub,
          markers: false,
        };
      }

      gsap.from(spansRef.current, animationConfig);

      return () => {
        gsap.killTweensOf(spansRef.current);
      };
    }, [children, duration, stagger, delay, useTrigger, start, end, scrub, type, onAnimationComplete]);

    return (
      <div ref={containerRef || ref} className={className} style={{ position: 'relative' }}>
        {!ref && children}
      </div>
    );
  }
);

SplitText.displayName = 'SplitText';
