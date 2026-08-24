'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { getGameSvgIcon } from './GameIcons';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export interface OpenLobby {
  id: string;
  gameId: string;
  gameTitle: string;
  roomCode: string;
  hostName: string;
  currentPlayers: number;
  maxPlayers: number;
  route: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt?: string;
}

const MULTIPLAYER_GAMES = [
  { id: 'chess', title: 'Chess', route: '/games/chess', icon: 'chess', color: 'from-amber-600 to-amber-900' },
  { id: 'caro', title: 'Caro', route: '/games/caro', icon: 'caro', color: 'from-sky-500 to-blue-700' },
  { id: 'battleship', title: 'Battleship', route: '/games/battleship', icon: 'battleship', color: 'from-emerald-500 to-teal-700' },
  { id: 'monopoly', title: 'Monopoly', route: '/games/monopoly', icon: 'monopoly', color: 'from-blue-700 to-slate-900' },
];

export function ActiveRoomsBar() {
  const [lobbies, setLobbies] = useState<OpenLobby[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active lobbies from REST endpoint as fallback/initial load
  const fetchLobbiesREST = useCallback(async () => {
    try {
      const res = await fetch(`${SOCKET_URL}/lobbies`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.lobbies)) {
          setLobbies(data.lobbies);
        }
      }
    } catch {
      // Server might be starting or offline
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect to Socket.io for instant real-time room creation/joining broadcasts
  useEffect(() => {
    fetchLobbiesREST();

    let socket: Socket | null = null;
    try {
      socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        timeout: 4000,
      });

      socket.on('connect', () => {
        setIsConnected(true);
        socket?.emit('get_active_lobbies');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('active_lobbies', (activeList: OpenLobby[]) => {
        if (Array.isArray(activeList)) {
          setLobbies(activeList);
          setIsLoading(false);
        }
      });
    } catch {
      setIsConnected(false);
    }

    // Polling interval as resilient fallback
    const interval = setInterval(fetchLobbiesREST, 5000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [fetchLobbiesREST]);

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="rounded-3xl border border-border bg-surface/90 p-6 sm:p-8 backdrop-blur-xl shadow-sm">
        {/* Header with Live Connection Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Live Multiplayer Lobbies
              </h3>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-foreground-secondary">
              Real-time matches currently active on the server. Jump into an open room or create your own duel.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/80 px-3 py-1.5 text-xs font-mono text-foreground-secondary shadow-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>{isConnected ? 'Socket Live' : 'Connecting...'}</span>
            </span>

            <span className="rounded-xl border border-border bg-background/80 px-3 py-1.5 text-xs font-mono font-bold text-accent shadow-xs">
              {lobbies.length} {lobbies.length === 1 ? 'Open Room' : 'Open Rooms'}
            </span>
          </div>
        </div>

        {/* Lobbies Content */}
        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-foreground-muted">
            Checking active rooms...
          </div>
        ) : lobbies.length === 0 ? (
          /* Empty State: No active rooms right now — prompt user to create one */
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-background/50 p-6 sm:p-8 text-center backdrop-blur-md">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-light text-accent border border-accent/20 mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h4 className="text-base font-bold text-foreground">No open multiplayer rooms right now</h4>
            <p className="mt-1 text-xs text-foreground-secondary max-w-md mx-auto">
              Be the first to host a match! Choose a multiplayer game below to create a room code and invite friends.
            </p>

            {/* Quick 1-Click Game Launchers */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {MULTIPLAYER_GAMES.map((game) => (
                <Link
                  key={game.id}
                  href={game.route}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-bold text-foreground hover:border-accent hover:text-accent hover:shadow-sm transition-all shadow-xs"
                >
                  <span className="flex h-5 w-5 items-center justify-center text-accent">
                    {getGameSvgIcon(game.id, '', 14)}
                  </span>
                  <span>Create {game.title} Room</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          /* Live Lobbies Grid */
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {lobbies.map((lobby, index) => (
                <motion.div
                  key={lobby.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border bg-background/80 p-4.5 transition-all duration-200 hover:border-sky-500/50 hover:bg-surface-hover/80 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                          {getGameSvgIcon(lobby.gameId, '', 16)}
                        </span>
                        <span className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                          {lobby.gameTitle}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {lobby.currentPlayers}/{lobby.maxPlayers}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-foreground-muted">
                      <span className="truncate max-w-[120px]">Host: {lobby.hostName}</span>
                      <button
                        onClick={(e) => handleCopyCode(lobby.roomCode, e)}
                        title="Copy Room Code"
                        className="inline-flex items-center gap-1 font-mono text-xs text-foreground-secondary hover:text-accent transition-colors"
                      >
                        <span>{lobby.roomCode}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>

                    {copiedCode === lobby.roomCode && (
                      <p className="mt-1 text-xs font-medium text-emerald-500 text-right">
                        Code copied!
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/80">
                    <Link
                      href={`${lobby.route}?room=${lobby.roomCode}`}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-2.5 text-xs font-bold text-white transition-all hover:from-sky-400 hover:to-blue-500 hover:shadow-md hover:shadow-sky-500/20"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>Join Room</span>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

export default ActiveRoomsBar;
