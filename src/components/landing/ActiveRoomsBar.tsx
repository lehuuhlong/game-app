'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getGameSvgIcon } from './GameIcons';

interface OpenLobby {
  id: string;
  gameId: string;
  gameTitle: string;
  roomCode: string;
  hostName: string;
  currentPlayers: number;
  maxPlayers: number;
  route: string;
  status: 'waiting' | 'in_progress';
}

// Representative active lobby fixtures for real-time engagement
const SAMPLE_OPEN_LOBBIES: OpenLobby[] = [
  {
    id: 'lobby-1',
    gameId: 'chess',
    gameTitle: 'Chess',
    roomCode: 'CH-7821',
    hostName: 'Grandmaster99',
    currentPlayers: 1,
    maxPlayers: 2,
    route: '/games/chess',
    status: 'waiting',
  },
  {
    id: 'lobby-2',
    gameId: 'caro',
    gameTitle: 'Caro 5-in-a-Row',
    roomCode: 'CR-4309',
    hostName: 'DragonBlade',
    currentPlayers: 1,
    maxPlayers: 2,
    route: '/games/caro',
    status: 'waiting',
  },
  {
    id: 'lobby-3',
    gameId: 'battleship',
    gameTitle: 'Battleship',
    roomCode: 'BS-1054',
    hostName: 'AdmiralViper',
    currentPlayers: 1,
    maxPlayers: 2,
    route: '/games/battleship',
    status: 'waiting',
  },
  {
    id: 'lobby-4',
    gameId: 'monopoly',
    gameTitle: 'Monopoly',
    roomCode: 'MP-9240',
    hostName: 'TycoonKing',
    currentPlayers: 2,
    maxPlayers: 4,
    route: '/games/monopoly',
    status: 'waiting',
  },
];

export function ActiveRoomsBar() {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
        {/* Header & Quick Code Entry */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Live Multiplayer Lobbies
              </h3>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-foreground-secondary">
              Jump directly into open 1v1 rooms or join with a friend’s room code.
            </p>
          </div>

          {/* Quick Room Code Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (roomCodeInput.trim()) {
                // If it looks like a specific game code or standard code, navigate to first multiplayer game
                window.location.href = `/games/caro?room=${encodeURIComponent(roomCodeInput.trim().toUpperCase())}`;
              }
            }}
            className="flex items-center gap-2 max-w-md w-full md:w-auto"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter Room Code (e.g. CR-4309)"
                maxLength={10}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs sm:text-sm font-mono uppercase tracking-wider text-foreground placeholder:text-foreground-muted transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <button
              type="submit"
              disabled={!roomCodeInput.trim()}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-xs font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              Join
            </button>
          </form>
        </div>

        {/* Lobbies Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SAMPLE_OPEN_LOBBIES.map((lobby, index) => (
            <motion.div
              key={lobby.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="group relative flex flex-col justify-between rounded-2xl border border-border bg-background/70 dark:bg-slate-950/70 p-4 transition-all duration-200 hover:border-violet-500/50 hover:bg-surface-hover/80 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                      {getGameSvgIcon(lobby.gameId, '', 14)}
                    </span>
                    <span className="text-sm font-bold text-foreground group-hover:text-violet-500 transition-colors">
                      {lobby.gameTitle}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {lobby.currentPlayers}/{lobby.maxPlayers}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-foreground-muted">
                  <span className="truncate max-w-[110px]">Host: {lobby.hostName}</span>
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2 text-xs font-bold text-white transition-all hover:from-violet-500 hover:to-indigo-500 hover:shadow-md hover:shadow-violet-600/20"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Join Match</span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ActiveRoomsBar;
