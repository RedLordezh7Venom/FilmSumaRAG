'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  offset?: number;
  speed?: number;
  direction?: 'up' | 'down';
}

export const ParallaxSection = React.forwardRef<HTMLDivElement, ParallaxSectionProps>(
  (
    {
      children,
      className = '',
      intensity = 0.5,
      offset = 0,
      speed = 1,
      direction = 'up',
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const container = (ref && typeof ref === 'object' ? ref.current : null) || containerRef.current;
      const inner = innerRef.current;

      if (!container || !inner) return;

      const moveDistance = intensity * 100;
      const yDirection = direction === 'down' ? moveDistance : -moveDistance;

      gsap.to(inner, {
        y: yDirection,
        scrollTrigger: {
          trigger: container,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.5,
          markers: false,
        },
        ease: 'none',
      });

      return () => {
        ScrollTrigger.getAll().forEach(trigger => {
          if (trigger.vars.trigger === container) {
            trigger.kill();
          }
        });
      };
    }, [intensity, direction, offset]);

    return (
      <div ref={containerRef || ref} className={`overflow-hidden ${className}`}>
        <div ref={innerRef} style={{ willChange: 'transform' }}>
          {children}
        </div>
      </div>
    );
  }
);

ParallaxSection.displayName = 'ParallaxSection';
