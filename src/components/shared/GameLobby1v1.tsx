"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export interface LobbyPlayer {
  id: string;
  username: string;
}

export interface GameLobby1v1Props {
  screen: "lobby" | "waiting";
  roomId?: string;
  players?: LobbyPlayer[];
  statusMsg?: string;
  joinError?: string | null;
  copied?: boolean;
  createButtonText?: string;
  createButtonIcon?: React.ReactNode;
  createRoomExtra?: React.ReactNode;
  waitingExtra?: React.ReactNode;
  renderPlayerExtra?: (player: LobbyPlayer, index: number) => React.ReactNode;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onCopyRoomCode?: () => void;
  onLeaveRoom?: () => void;
}

export function GameLobby1v1({
  screen,
  roomId = "",
  players = [],
  statusMsg = "Waiting for opponent...",
  joinError,
  copied = false,
  createButtonText = "Create Room",
  createButtonIcon,
  createRoomExtra,
  waitingExtra,
  renderPlayerExtra,
  onCreateRoom,
  onJoinRoom,
  onCopyRoomCode,
  onLeaveRoom,
}: GameLobby1v1Props) {
  const [inputCode, setInputCode] = useState("");
  const [localCopied, setLocalCopied] = useState(false);

  const handleJoin = () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (trimmed) {
      onJoinRoom(trimmed);
    }
  };

  const handleCopy = async () => {
    if (onCopyRoomCode) {
      onCopyRoomCode();
    } else if (roomId) {
      try {
        await navigator.clipboard.writeText(roomId);
        setLocalCopied(true);
        setTimeout(() => setLocalCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy code", err);
      }
    }
  };

  const isCopied = copied || localCopied;

  return (
    <>
      {/* ── LOBBY SCREEN ─────────────────────────────────────────────── */}
      {screen === "lobby" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md mx-auto space-y-4"
        >
          {/* Create Room Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Create a Room</h2>

            {createRoomExtra}

            <p className="text-sm text-foreground-secondary">
              Start a new game and share the room code with your friend.
            </p>

            <button
              type="button"
              onClick={onCreateRoom}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-bold text-white hover:from-sky-600 hover:to-blue-700 hover:-translate-y-0.5 transition-all shadow-lg"
            >
              {createButtonIcon}
              <span>{createButtonText}</span>
            </button>
          </div>

          {/* Join Room Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-3 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Join a Room</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="Room code..."
                maxLength={6}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none uppercase font-mono tracking-widest"
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={!inputCode.trim()}
                className="rounded-xl bg-surface-hover border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent hover:text-white hover:border-accent transition-all disabled:opacity-50"
              >
                Join
              </button>
            </div>
            {joinError && <p className="text-sm text-red-500">{joinError}</p>}
          </div>
        </motion.div>
      )}

      {/* ── WAITING SCREEN ───────────────────────────────────────────── */}
      {screen === "waiting" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md mx-auto text-center"
        >
          <div className="rounded-2xl border border-border bg-surface p-8 space-y-5 shadow-sm">
            <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-foreground">{statusMsg}</h2>

            {/* Room Code Box */}
            <div className="rounded-xl bg-background border border-border p-5 relative">
              <p className="text-xs text-foreground-muted mb-1">Room Code</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-4xl font-extrabold text-accent font-mono tracking-widest">
                  {roomId}
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-foreground-secondary hover:text-foreground transition-colors border border-border"
                  title="Copy Room Code"
                >
                  {isCopied ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-green-500"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>

              {waitingExtra ? (
                <div className="mt-2">{waitingExtra}</div>
              ) : (
                <p className="text-xs text-foreground-muted mt-2">
                  Share with your friend
                </p>
              )}
            </div>

            {/* Players in Waiting Room */}
            <div className="space-y-1 text-sm text-foreground-secondary">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-center gap-2"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{p.username}</span>
                  {renderPlayerExtra && renderPlayerExtra(p, i)}
                </div>
              ))}
            </div>

            {/* Leave / Cancel Button */}
            {onLeaveRoom && (
              <button
                type="button"
                onClick={onLeaveRoom}
                className="text-sm text-foreground-muted hover:text-red-500 transition-colors underline"
              >
                Cancel
              </button>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
}
