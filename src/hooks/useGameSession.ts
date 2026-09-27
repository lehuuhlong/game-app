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
   * @param preserveStartTime set to true to keep the original start time when renewing mid-game
   *        (e.g. Pikachu level transitions). This ensures getElapsedDuration() still reports
   *        total play time, which is needed for score/duration ratio validation.
   */
  const startSession = useCallback(
    async (userId?: string | null, username?: string | null, force = false, preserveStartTime = false): Promise<string | null> => {
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

      const savedStartTime = startTimeRef.current;

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
            // When renewing mid-game (preserveStartTime=true), keep original start time
            // so getElapsedDuration() reports total play time, not per-level time.
            if (!preserveStartTime) {
              startTimeRef.current = data.startTime || Date.now();
            } else {
              startTimeRef.current = savedStartTime;
            }
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
   * If the current session is nearing expiry (>80% of server TTL), it auto-renews
   * to prevent "session expired" errors during long play sessions.
   */
  const ensureSessionToken = useCallback(
    async (userId?: string | null, username?: string | null): Promise<string | null> => {
      if (sessionTokenRef.current) {
        // Check if the session is nearing expiry and proactively renew it.
        // The server TTL varies per game, but we use a conservative 5-hour
        // threshold that works for long-session games like pikachu.
        const ageMs = Date.now() - startTimeRef.current;
        const PROACTIVE_RENEW_MS = 5 * 60 * 60 * 1000; // 5 hours
        if (ageMs > PROACTIVE_RENEW_MS) {
          // Token is old — force renew to avoid server rejection, but preserve
          // the original start time so elapsed duration stays cumulative.
          return await startSession(userId, username, true, true);
        }
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

