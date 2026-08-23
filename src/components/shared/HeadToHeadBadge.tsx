"use client";

import { useEffect, useState } from "react";

interface H2HData {
  player1: {
    username: string;
    avatarUrl: string | null;
    wins: number;
    winRate: number;
  };
  player2: {
    username: string;
    avatarUrl: string | null;
    wins: number;
    winRate: number;
  };
  totalMatches: number;
  draws: number;
}

interface HeadToHeadBadgeProps {
  player1: string; // My username
  player2: string; // Opponent username
  gameType?: string;
  compact?: boolean;
}

export function HeadToHeadBadge({
  player1,
  player2,
  gameType,
  compact = false,
}: HeadToHeadBadgeProps) {
  const [data, setData] = useState<H2HData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player1 || !player2 || player1.toLowerCase() === player2.toLowerCase()) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    async function fetchH2H() {
      try {
        let url = `/api/matches/h2h?player1=${encodeURIComponent(player1)}&player2=${encodeURIComponent(player2)}`;
        if (gameType) url += `&gameType=${encodeURIComponent(gameType)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (active) setData(json);
      } catch (err) {
        console.error("Error fetching H2H stats:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchH2H();
    return () => {
      active = false;
    };
  }, [player1, player2, gameType]);

  if (!player1 || !player2 || player1.toLowerCase() === player2.toLowerCase()) {
    return null;
  }

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface border border-border/60 text-xs text-foreground-muted animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-accent/50 animate-ping" />
        <span>Loading H2H...</span>
      </div>
    );
  }

  const isFirstEncounter = !data || data.totalMatches === 0;

  if (isFirstEncounter) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium ${
          compact ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs"
        }`}
      >
        <span>⚔️</span>
        <span>
          First match vs <strong className="text-foreground font-bold">{player2}</strong>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface text-foreground font-semibold shadow-sm ${
        compact ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs"
      }`}
    >
      <span className="text-amber-400">⚔️</span>
      <span className="text-foreground-secondary">H2H:</span>
      <span className="font-bold text-sky-400">{data.player1.wins}W</span>
      <span className="text-foreground-muted">-</span>
      <span className="font-bold text-rose-400">{data.player2.wins}L</span>
      {data.draws > 0 && (
        <>
          <span className="text-foreground-muted">-</span>
          <span className="text-foreground-muted">{data.draws}D</span>
        </>
      )}
      <span className="text-foreground-muted font-normal">({data.player1.winRate}% WR)</span>
    </div>
  );
}
