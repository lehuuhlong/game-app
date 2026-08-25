'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export type GraphicsMode = 'high' | 'eco';

interface PerformanceContextValue {
  graphicsMode: GraphicsMode;
  isLowPowerDevice: boolean;
  setGraphicsMode: (mode: GraphicsMode) => void;
  toggleGraphicsMode: () => void;
}

const PerformanceContext = createContext<PerformanceContextValue>({
  graphicsMode: 'high',
  isLowPowerDevice: false,
  setGraphicsMode: () => {},
  toggleGraphicsMode: () => {},
});

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const [graphicsMode, setGraphicsModeState] = useState<GraphicsMode>('high');
  const [isLowPowerDevice, setIsLowPowerDevice] = useState(false);

  useEffect(() => {
    // 1. Detect device capability
    let isLowSpec = false;

    // Check hardware concurrency (cores <= 4 typically indicates low-power/older CPU without dGPU)
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
      isLowSpec = true;
    }

    // Check user preference for reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      isLowSpec = true;
    }

    // Check touch-only device (phones / lower-end tablets)
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
      isLowSpec = true;
    }

    setIsLowPowerDevice(isLowSpec);

    // 2. Read stored preference or apply auto-detected default
    const stored = localStorage.getItem('graphics-mode') as GraphicsMode | null;
    if (stored === 'high' || stored === 'eco') {
      setGraphicsModeState(stored);
      document.documentElement.classList.toggle('perf-mode', stored === 'eco');
    } else if (isLowSpec) {
      // Default to eco mode for low-power devices for instant silky 60fps
      setGraphicsModeState('eco');
      document.documentElement.classList.add('perf-mode');
    }
  }, []);

  const applyMode = useCallback((mode: GraphicsMode) => {
    setGraphicsModeState(mode);
    localStorage.setItem('graphics-mode', mode);
    if (mode === 'eco') {
      document.documentElement.classList.add('perf-mode');
    } else {
      document.documentElement.classList.remove('perf-mode');
    }
  }, []);

  const toggleGraphicsMode = useCallback(() => {
    const next = graphicsMode === 'high' ? 'eco' : 'high';
    applyMode(next);
  }, [graphicsMode, applyMode]);

  return (
    <PerformanceContext.Provider
      value={{
        graphicsMode,
        isLowPowerDevice,
        setGraphicsMode: applyMode,
        toggleGraphicsMode,
      }}
    >
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance(): PerformanceContextValue {
  return useContext(PerformanceContext);
}
