# FilmSumaRAG Animation System Guide

## Overview

This document outlines the comprehensive animation system implemented for FilmSumaRAG, featuring industry-standard scroll-based animations, split text reveals, and parallax effects powered by GSAP and Framer Motion.

## Installation

All dependencies have been installed:
- **GSAP** (GreenSock Animation Platform) - Industry-standard animation library
- **Framer Motion** - React animation library (already present)
- **ScrollTrigger Plugin** - GSAP's scroll-based animation engine

## Architecture

### Animation Libraries

#### GSAP (GreenSock Animation Platform)
- **Use for**: Scroll-triggered animations, complex timing, performance-critical animations
- **Plugins**: ScrollTrigger for scroll-based effects
- **Performance**: GPU-accelerated, battery-friendly

#### Framer Motion
- **Use for**: Interactive UI animations, gesture-based animations, component transitions
- **Already integrated** with the existing codebase

## Components

### 1. **SplitText Component**
Location: `/components/effects/split-text.tsx`

Character-by-character or word-by-word text reveal animations.

```tsx
import { SplitText } from '@/components/effects/split-text';

<SplitText 
  className="text-9xl font-black italic"
  duration={0.6}
  stagger={0.05}
  delay={0.1}
  trigger={false}
>
  SUM A FILM
</SplitText>
```

**Props:**
- `type`: 'chars' | 'words' | 'lines' (default: 'chars')
- `duration`: Animation duration in seconds
- `stagger`: Delay between each character/word
- `delay`: Initial delay before animation starts
- `trigger`: Use scroll trigger animation
- `start/end`: Scroll trigger start/end positions
- `scrub`: Smooth scroll-linked animation

### 2. **ParallaxSection Component**
Location: `/components/effects/parallax-section.tsx`

Parallax scrolling effect for background elements.

```tsx
import { ParallaxSection } from '@/components/effects/parallax-section';

<ParallaxSection intensity={0.3} direction="up">
  <YourContent />
</ParallaxSection>
```

**Props:**
- `intensity`: Parallax strength (0-1)
- `direction`: 'up' | 'down'
- `offset`: Additional Y offset
- `speed`: Animation speed multiplier

### 3. **ScrollReveal Component**
Location: `/components/effects/scroll-reveal.tsx`

Reveal elements as they enter the viewport.

```tsx
import { ScrollReveal } from '@/components/effects/scroll-reveal';

<ScrollReveal direction="up" distance={30} duration={0.8}>
  <div data-reveal>Item 1</div>
  <div data-reveal>Item 2</div>
</ScrollReveal>
```

**Props:**
- `direction`: 'up' | 'down' | 'left' | 'right'
- `distance`: Animation distance in pixels
- `duration`: Animation duration
- `stagger`: Delay between child animations
- `start/end`: Scroll trigger positions
- `scrub`: Smooth scroll-linked animation

### 4. **AccessibleAnimation Component**
Location: `/components/effects/accessible-animation.tsx`

Wrapper that respects user's `prefers-reduced-motion` preference.

```tsx
import { AccessibleAnimation } from '@/components/effects/accessible-animation';

<AccessibleAnimation 
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.6 }}
>
  Content
</AccessibleAnimation>
```

## Hooks

### 1. **useScrollTrigger**
Location: `/hooks/use-scroll-trigger.ts`

Create scroll-triggered animations with GSAP.

```tsx
const ref = useScrollTrigger((trigger) => {
  gsap.to(element, {
    y: 100,
    scrollTrigger: trigger,
  });
}, {
  start: 'top center',
  end: 'bottom center'
});
```

### 2. **useSplitText**
Location: `/hooks/use-split-text.ts`

Programmatically split and animate text.

```tsx
const { elementRef, animateIn } = useSplitText({
  type: 'chars',
  autoAnimate: true
});

<div ref={elementRef}>Your text here</div>
```

### 3. **usePrefersReducedMotion**
Location: `/hooks/use-prefers-reduced-motion.ts`

Respect user accessibility preferences.

```tsx
const prefersReducedMotion = usePrefersReducedMotion();

if (!prefersReducedMotion) {
  // Apply animations
}
```

## Animation Utilities

Location: `/lib/animations.ts`

Predefined GSAP animations and easing presets:

```tsx
import { gsapAnimations, gsapEases } from '@/lib/animations';

// Available animations
gsapAnimations.fadeIn(element, duration);
gsapAnimations.slideUp(element, duration, distance);
gsapAnimations.slideDown(element, duration, distance);
gsapAnimations.slideLeft(element, duration, distance);
gsapAnimations.slideRight(element, duration, distance);
gsapAnimations.scale(element, duration, startScale);
gsapAnimations.rotate(element, duration, degrees);

// Available eases
gsapEases.smooth        // power2.inOut
gsapEases.easeOut       // power3.out
gsapEases.easeIn        // power3.in
gsapEases.bouncy        // back.out
gsapEases.elastic       // elastic.out(1, 0.5)
```

## Current Implementations

### Homepage (`/app/page.tsx`)
- **Split Text Animation**: Title characters reveal with stagger
- **Parallax Effect**: Movie card section uses parallax scroll
- **Smooth Transitions**: Input field and content sections animate in sequentially
- **Interactive Hover**: Search input scales on focus

### Browse Page (`/app/browse/page.tsx`)
- **Header Animations**: Staggered entrance animations
- **Genre Filter Buttons**: Sequential fade-in with hover effects
- **Movie Grid**: Scroll-triggered card animations with stagger
- **Card Hover**: Lift effect on hover with smooth transitions

## Performance Optimizations

### GPU Acceleration
- `will-change` utilities applied to animated elements
- Transform and opacity only (fastest properties)
- GSAP using hardware-accelerated rendering

### CSS Utilities
Location: `/app/globals.css`

```css
/* GPU Acceleration */
[data-movie-card],
.archive-poster {
  will-change: transform, opacity;
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Accessibility

### Respecting User Preferences
All components check `prefers-reduced-motion`:
- If enabled, animations are skipped or dramatically shortened
- No visual information is animation-dependent
- Fallback static content is always accessible

### Best Practices Applied
- Semantic HTML maintained
- ARIA attributes preserved
- Focus management intact
- Keyboard navigation not affected

## Best Practices

### 1. **Use ScrollTrigger for Scroll-Based Effects**
```tsx
gsap.to(element, {
  scrollTrigger: {
    trigger: element,
    start: 'top center',
    end: 'bottom center',
    scrub: 0.5,
    once: true, // Animation plays only once
  }
});
```

### 2. **Combine Libraries Efficiently**
- Use Framer Motion for interactive UI animations
- Use GSAP for complex scroll-based animations
- Don't animate transform properties that affect layout

### 3. **Stagger for Visual Rhythm**
```tsx
// Card grid with staggered entrance
cards.forEach((card, index) => {
  gsap.from(card, {
    opacity: 0,
    y: 30,
    delay: index * 0.05,
  });
});
```

### 4. **Clean Up Animations**
```tsx
useEffect(() => {
  // ... animation setup ...
  
  return () => {
    gsap.killTweensOf(element);
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  };
}, []);
```

## Debugging

### Enable ScrollTrigger Markers
```tsx
scrollTrigger: {
  markers: true, // Shows animation timeline in viewport
}
```

### Console Logging
```tsx
gsap.to(element, {
  duration: 1,
  opacity: 1,
  onStart: () => console.log('Animation started'),
  onComplete: () => console.log('Animation complete'),
});
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

GSAP uses feature detection and gracefully degrades on older browsers.

## Resources

- [GSAP Documentation](https://gsap.com/docs/)
- [ScrollTrigger Plugin](https://gsap.com/docs/v3/Plugins/ScrollTrigger)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Web Animations Performance](https://web.dev/animations-guide/)

## Future Enhancements

Potential additions:
- Lottie animation support for complex illustrations
- Three.js integration for 3D effects
- Custom easing functions
- Gesture-based animations for mobile
- Video scroll-triggering
