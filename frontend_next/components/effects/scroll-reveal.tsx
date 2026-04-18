'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  stagger?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  markers?: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
}

export const ScrollReveal = React.forwardRef<HTMLDivElement, ScrollRevealProps>(
  (
    {
      children,
      className = '',
      duration = 0.8,
      delay = 0,
      stagger = 0.1,
      direction = 'up',
      distance = 30,
      start = 'top 80%',
      end = 'top 20%',
      scrub = false,
      markers = false,
      onEnter,
      onLeave,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const container = (ref && typeof ref === 'object' ? ref.current : null) || containerRef.current;
      if (!container) return;

      // Get all children for stagger animation
      const children = container.querySelectorAll('[data-reveal]') as NodeListOf<HTMLElement>;
      
      let animationFrom: any = {
        opacity: 0,
      };

      switch (direction) {
        case 'up':
          animationFrom.y = distance;
          break;
        case 'down':
          animationFrom.y = -distance;
          break;
        case 'left':
          animationFrom.x = distance;
          break;
        case 'right':
          animationFrom.x = -distance;
          break;
      }

      const animationConfig: any = {
        ...animationFrom,
        duration,
        stagger: children.length > 1 ? stagger : 0,
        delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: container,
          start,
          end,
          scrub,
          markers,
          onEnter,
          onLeave,
        },
      };

      gsap.from(children.length > 0 ? children : container, animationConfig);

      return () => {
        gsap.killTweensOf(children.length > 0 ? children : container);
        ScrollTrigger.getAll().forEach(trigger => {
          if (trigger.vars.trigger === container) {
            trigger.kill();
          }
        });
      };
    }, [duration, delay, stagger, direction, distance, start, end, scrub, markers]);

    return (
      <div ref={containerRef || ref} className={className}>
        {React.Children.map(children, child => (
          React.isValidElement(child) ? React.cloneElement(child, { 'data-reveal': true } as any) : child
        ))}
      </div>
    );
  }
);

ScrollReveal.displayName = 'ScrollReveal';
