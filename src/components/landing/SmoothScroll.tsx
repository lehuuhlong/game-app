'use client';

import React, { useEffect, useRef, type ReactNode } from 'react';
import Lenis from 'lenis';
import { usePerformance } from '@/components/shared';

interface SmoothScrollProps {
  children: ReactNode;
}

/**
 * Global adaptive smooth scroll wrapper powered by Lenis.
 * Automatically bypassed on touch devices, eco mode, or reduced-motion preferences
 * to achieve 0% JS overhead and silky native hardware momentum scrolling.
 */
export function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const { graphicsMode, isLowPowerDevice } = usePerformance();

  useEffect(() => {
    // Bypass on low-power devices, Eco Mode, touch devices, or reduced motion
    if (graphicsMode === 'eco' || isLowPowerDevice) return;

    if (typeof window === 'undefined') return;

    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || prefersReducedMotion) return;

    // Initialize lightweight Lenis smooth scroll engine
    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    lenisRef.current = lenis;

    let rafId: number | null = null;
    let isTabVisible = true;

    function raf(time: number) {
      if (isTabVisible) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      }
    }

    const handleVisibility = () => {
      isTabVisible = document.visibilityState === 'visible';
      if (isTabVisible && !rafId) {
        rafId = requestAnimationFrame(raf);
      } else if (!isTabVisible && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    rafId = requestAnimationFrame(raf);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafId) cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [graphicsMode, isLowPowerDevice]);

  return <>{children}</>;
}

export default SmoothScroll;
