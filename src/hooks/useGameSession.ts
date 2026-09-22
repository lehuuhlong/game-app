'use client';

import { useRef, useCallback } from 'react';

export function useGameSession(gameType: string) {
  const sessionTokenRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const inFlightPromiseRef = useRef<Promise<string | null> | null>(null);

  /**
   * Start or retrieve an active game session.
   *
   * @param userId optional logged in user ID
   * @param username optional logged in username
   * @param force set to true to force creating a brand new session (e.g. on game restart)
   */
  const startSession = useCallback(
    async (userId?: string | null, username?: string | null, force = false): Promise<string | null> => {
      // 1. If an active session already exists and force restart is not requested, reuse it
      if (!force && sessionTokenRef.current) {
        return sessionTokenRef.current;
      }

      // 2. If a session request is already in-flight for this exact restart, reuse the same promise
      if (inFlightPromiseRef.current) {
        return inFlightPromiseRef.current;
      }

      // Clear token when forcing a new session so stale tokens aren't accidentally reused
      if (force) {
        sessionTokenRef.current = null;
        sessionIdRef.current = null;
      }

      const promise = (async () => {
        try {
          const res = await fetch('/api/games/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameType, userId, username }),
          });

          if (res.ok) {
            const data = await res.json();
            sessionTokenRef.current = data.sessionToken;
            sessionIdRef.current = data.sessionId;
            startTimeRef.current = data.startTime || Date.now();
            return data.sessionToken;
          }
        } catch (err) {
          console.error(`Failed to start game session for ${gameType}:`, err);
        } finally {
          inFlightPromiseRef.current = null;
        }
        return null;
      })();

      inFlightPromiseRef.current = promise;
      return promise;
    },
    [gameType]
  );

  /**
   * Synchronously get the current session token if available.
   */
  const getSessionToken = useCallback(() => sessionTokenRef.current, []);

  /**
   * Asynchronously ensure a valid session token is ready.
   * If a session is in-flight, it awaits it. If none exists, it starts one.
   */
  const ensureSessionToken = useCallback(
    async (userId?: string | null, username?: string | null): Promise<string | null> => {
      if (sessionTokenRef.current) {
        return sessionTokenRef.current;
      }
      if (inFlightPromiseRef.current) {
        return await inFlightPromiseRef.current;
      }
      return await startSession(userId, username, false);
    },
    [startSession]
  );

  const getElapsedDuration = useCallback(() => {
    return Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000));
  }, []);

  const clearSession = useCallback(() => {
    sessionTokenRef.current = null;
    sessionIdRef.current = null;
    inFlightPromiseRef.current = null;
  }, []);

  return {
    startSession,
    getSessionToken,
    ensureSessionToken,
    getElapsedDuration,
    clearSession,
    sessionTokenRef,
  };
}

