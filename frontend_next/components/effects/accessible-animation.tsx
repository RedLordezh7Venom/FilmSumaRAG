'use client';

import React from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { motion, MotionProps } from 'framer-motion';

interface AccessibleAnimationProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
}

export const AccessibleAnimation = React.forwardRef<HTMLDivElement, AccessibleAnimationProps>(
  ({ children, className = '', initial, animate, exit, transition, ...props }, ref) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    // If user prefers reduced motion, render without animation
    if (prefersReducedMotion) {
      return (
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      );
    }

    // Otherwise, render with animation
    return (
      <motion.div
        ref={ref}
        className={className}
        initial={initial}
        animate={animate}
        exit={exit}
        transition={transition}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

AccessibleAnimation.displayName = 'AccessibleAnimation';

/**
 * Hook to get animation config based on user preferences
 * Use this when you need conditional animation properties
 */
export function useAccessibleAnimation() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return {
    prefersReducedMotion,
    // Return reduced transition duration if motion is not preferred
    transitionDuration: prefersReducedMotion ? 0.01 : 0.6,
    // Return empty animation if motion is not preferred
    animationProps: prefersReducedMotion ? {} : {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.6 },
    },
  };
}
