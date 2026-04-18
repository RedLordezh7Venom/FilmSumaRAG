'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface ScrollTriggerOptions {
  trigger?: string | Element;
  start?: string;
  end?: string;
  markers?: boolean;
  anticipatePin?: number;
  onEnter?: () => void;
  onLeave?: () => void;
  onEnterBack?: () => void;
  onLeaveBack?: () => void;
}

export function useScrollTrigger(callback: (trigger: ScrollTrigger) => void, options: ScrollTriggerOptions = {}) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = options.trigger ? (typeof options.trigger === 'string' ? document.querySelector(options.trigger) : options.trigger) : elementRef.current;
    
    if (!element) return;

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: options.start || 'top center',
      end: options.end || 'bottom center',
      markers: options.markers || false,
      anticipatePin: options.anticipatePin || 1,
      onEnter: options.onEnter,
      onLeave: options.onLeave,
      onEnterBack: options.onEnterBack,
      onLeaveBack: options.onLeaveBack,
    });

    callback(trigger);

    return () => {
      trigger.kill();
    };
  }, [callback, options.trigger, options.start, options.end, options.markers, options.anticipatePin]);

  return elementRef;
}
