'use client';

import { motion } from 'framer-motion';
import gsap from 'gsap';

// Framer Motion Animations
export const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: "easeOut" }
};

export const containerStagger = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const itemFadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "backOut" }
};

export const tapScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: "spring", stiffness: 400, damping: 17 }
};

// GSAP Easing Presets
export const gsapEases = {
  smooth: 'power2.inOut',
  easeOut: 'power3.out',
  easeIn: 'power3.in',
  bouncy: 'back.out',
  elastic: 'elastic.out(1, 0.5)',
};

// GSAP Animation Presets
export const gsapAnimations = {
  fadeIn: (element: HTMLElement, duration = 0.6) => {
    return gsap.to(element, {
      opacity: 1,
      duration,
      ease: gsapEases.easeOut,
    });
  },
  
  slideUp: (element: HTMLElement, duration = 0.8, distance = 30) => {
    return gsap.fromTo(
      element,
      { opacity: 0, y: distance },
      { opacity: 1, y: 0, duration, ease: gsapEases.easeOut }
    );
  },

  slideDown: (element: HTMLElement, duration = 0.8, distance = 30) => {
    return gsap.fromTo(
      element,
      { opacity: 0, y: -distance },
      { opacity: 1, y: 0, duration, ease: gsapEases.easeOut }
    );
  },

  slideLeft: (element: HTMLElement, duration = 0.8, distance = 30) => {
    return gsap.fromTo(
      element,
      { opacity: 0, x: distance },
      { opacity: 1, x: 0, duration, ease: gsapEases.easeOut }
    );
  },

  slideRight: (element: HTMLElement, duration = 0.8, distance = 30) => {
    return gsap.fromTo(
      element,
      { opacity: 0, x: -distance },
      { opacity: 1, x: 0, duration, ease: gsapEases.easeOut }
    );
  },

  scale: (element: HTMLElement, duration = 0.6, startScale = 0.95) => {
    return gsap.fromTo(
      element,
      { opacity: 0, scale: startScale },
      { opacity: 1, scale: 1, duration, ease: gsapEases.bouncy }
    );
  },

  rotate: (element: HTMLElement, duration = 0.8, degrees = 360) => {
    return gsap.to(element, {
      rotation: degrees,
      duration,
      ease: gsapEases.smooth,
    });
  },
};
