"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { MultiplayerMode, MultiplayerScreen } from "../useBilliardsMultiplayer";
import type { Room } from "@/types/socket";

interface BilliardsLobbyProps {
  mode: MultiplayerMode;
  screen: MultiplayerScreen;
  roomId: string;
  room: Room | null;
  statusMsg: string;
  error: string | null;
  joinError: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onSelectLocalMode: () => void;
}

export function BilliardsLobby({
  mode,
  screen,
  roomId,
  room,
  statusMsg,
  error,
  joinError,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onSelectLocalMode,
}: BilliardsLobbyProps) {
  const [joinInput, setJoinInput] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinInput.trim()) {
      onJoinRoom(joinInput.trim());
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* ── Mode selector bar ── */}
      <div className="flex p-1 rounded-2xl bg-surface border border-border">
        <button
          type="button"
          onClick={() => {}}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            mode === "online"
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
              : "text-foreground-secondary hover:text-foreground"
          }`}
        >
          🌐 Online 2-Player
        </button>
        <button
          type="button"
          onClick={onSelectLocalMode}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            mode === "local"
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20"
              : "text-foreground-secondary hover:text-foreground"
          }`}
        >
          👥 Local Pass & Play
        </button>
      </div>

      {/* ── ERROR NOTICE ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold text-center"
        >
          ⚠️ {error}
        </motion.div>
      )}

      {/* ── LOBBY SCREEN ── */}
      {screen === "lobby" && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Create Room Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-foreground">Create a Room</h2>
              <p className="text-xs sm:text-sm text-foreground-secondary mt-1">
                Generate a unique room code and share it with your friend to play online.
              </p>
            </div>
            <button
              type="button"
              onClick={onCreateRoom}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 py-3 text-sm font-bold text-white hover:from-emerald-400 hover:to-green-500 transition-all shadow-lg shadow-emerald-600/25 hover:-translate-y-0.5 cursor-pointer"
            >
              Create Room
            </button>
          </div>

          {/* Join Room Card */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-3 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Join a Room</h2>
            <form onSubmit={handleJoinSubmit} className="flex gap-2">
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                placeholder="ROOM CODE..."
                maxLength={6}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none uppercase font-mono tracking-widest"
              />
              <button
                type="submit"
                disabled={!joinInput.trim()}
                className="rounded-xl bg-surface-hover border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-accent hover:text-white hover:border-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Join
              </button>
            </form>
            {joinError && (
              <p className="text-xs text-red-400 font-medium">{joinError}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── WAITING SCREEN ── */}
      {screen === "waiting" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-border bg-surface p-8 space-y-5 shadow-sm text-center"
        >
          <div className="h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto" />

          <div>
            <h2 className="text-xl font-extrabold text-foreground">
              {statusMsg || "Waiting for opponent..."}
            </h2>
            <p className="text-xs text-foreground-secondary mt-1">
              Share the code below with your opponent to start the game.
            </p>
          </div>

          <div className="rounded-2xl bg-background border border-border p-5 relative">
            <p className="text-xs uppercase font-bold text-foreground-muted tracking-wider mb-1">
              Room Code
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-black text-emerald-400 font-mono tracking-widest">
                {roomId}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2.5 rounded-xl bg-surface hover:bg-surface-hover text-foreground-secondary hover:text-foreground transition-all border border-border shadow-xs cursor-pointer"
                title="Copy Room Code"
              >
                {copied ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-emerald-400 font-medium mt-2">
                ✓ Copied code to clipboard!
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="w-full py-2.5 rounded-xl border border-border text-xs font-semibold text-foreground-secondary hover:bg-surface-hover hover:text-foreground transition-all cursor-pointer"
          >
            Leave Room
          </button>
        </motion.div>
      )}
    </div>
  );
}
