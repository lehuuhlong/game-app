"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UseGameTimerOptions {
  duration: number; // in seconds
  onTimeout?: () => void;
  autoStart?: boolean;
}

export function useGameTimer({
  duration,
  onTimeout,
  autoStart = false,
}: UseGameTimerOptions) {
  const [timeLeft, setTimeLeft] = useState<number>(duration);
  const [isActive, setIsActive] = useState<boolean>(autoStart);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  const durationRef = useRef(duration);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
  }, []);

  const startTimer = useCallback(
    (customDuration?: number) => {
      stopTimer();
      const initial = customDuration !== undefined ? customDuration : durationRef.current;
      setTimeLeft(initial);
      setIsActive(true);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopTimer();
            onTimeoutRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer]
  );

  const resetTimer = useCallback(
    (newDuration?: number) => {
      stopTimer();
      setTimeLeft(newDuration !== undefined ? newDuration : durationRef.current);
    },
    [stopTimer]
  );

  // Setup interval if autoStart on mount, and ensure cleanup on unmount
  useEffect(() => {
    if (autoStart) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsActive(false);
            onTimeoutRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      timerRef.current = interval;

      return () => {
        clearInterval(interval);
      };
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoStart]);

  const percent = duration > 0 ? (timeLeft / duration) * 100 : 0;
  const colorClass =
    timeLeft <= 5
      ? "bg-rose-500 text-rose-400"
      : timeLeft <= 10
      ? "bg-amber-500 text-amber-400"
      : "bg-emerald-500 text-emerald-400";

  return {
    timeLeft,
    setTimeLeft,
    isActive,
    percent,
    colorClass,
    startTimer,
    stopTimer,
    resetTimer,
  };
}
