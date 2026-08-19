'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth';

interface PlayerProfileData {
  username: string;
  avatarUrl: string | null;
  createdAt?: string;
  bestScore2048: number;
  highest2048Tile: number;
  caroWins: number;
  caroTotal: number;
  msBestBeginner: number;
  msBestIntermediate: number;
  msBestExpert: number;
  wordleWins: number;
  wordleTotal?: number;
  wordleGuesses1?: number;
  wordleGuesses2?: number;
  wordleGuesses3?: number;
  wordleGuesses4?: number;
  wordleGuesses5?: number;
  wordleGuesses6?: number;
  bestScoreTrex: number;
  wordchainWins: number;
  wordchainTotal: number;
  sudokuBestEasy: number;
  sudokuBestMedium: number;
  sudokuBestHard: number;
  chessWins: number;
  chessTotal: number;
  aimTrainerBestScore: number;
  aimTrainerBestAccuracy: number;
  battleshipWins: number;
  battleshipTotal: number;
  monopolyWins: number;
  monopolyTotal: number;
}

interface PlayerProfileModalProps {
  username: string | null;
  onClose: () => void;
  onCompareWithMe?: (targetUsername: string) => void;
}

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function PlayerProfileModal({ username, onClose, onCompareWithMe }: PlayerProfileModalProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  useEffect(() => {
    if (!username) return;
    let active = true;
    setLoading(true);

    async function fetchUserData() {
      try {
        const [userRes, matchesRes] = await Promise.all([
          fetch(`/api/users?q=${encodeURIComponent(username!)}`),
          fetch(`/api/matches?username=${encodeURIComponent(username!)}&limit=5`),
        ]);

        const userData = await userRes.json();
        const matchesData = await matchesRes.json();

        if (active) {
          const matchedUser = userData.users?.find((u: any) => u.username.toLowerCase() === username!.toLowerCase());
          setProfile(matchedUser || null);
          setRecentMatches(matchesData.matches || []);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchUserData();
    return () => {
      active = false;
    };
  }, [username]);

  if (!username) return null;

  const totalMultiplayerWins =
    (profile?.caroWins || 0) +
    (profile?.chessWins || 0) +
    (profile?.battleshipWins || 0) +
    (profile?.wordchainWins || 0) +
    (profile?.monopolyWins || 0);

  const totalMultiplayerGames =
    (profile?.caroTotal || 0) +
    (profile?.chessTotal || 0) +
    (profile?.battleshipTotal || 0) +
    (profile?.wordchainTotal || 0) +
    (profile?.monopolyTotal || 0);

  const overallWinRate = totalMultiplayerGames > 0 ? Math.round((totalMultiplayerWins / totalMultiplayerGames) * 100) : 0;

  const isCurrentUser = currentUser && currentUser.username.toLowerCase() === username.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="w-full max-w-2xl rounded-3xl border border-border bg-surface shadow-2xl p-6 sm:p-8 relative overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-xs text-foreground-muted">Loading player dossier...</p>
          </div>
        ) : !profile ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-4xl">🕵️‍♂️</div>
            <h3 className="text-lg font-bold text-foreground">Player Not Found</h3>
            <p className="text-xs text-foreground-muted">Could not retrieve stats for player &quot;{username}&quot;.</p>
          </div>
        ) : (
          <div className="overflow-y-auto pr-1 space-y-6">
            {/* Header Profile Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.username} className="h-20 w-20 rounded-2xl object-cover ring-4 ring-accent/20 shadow-md" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-2xl font-black text-white shadow-md">
                  {profile.username[0]?.toUpperCase()}
                </div>
              )}

              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{profile.username}</h2>
                  {isCurrentUser && <span className="px-2 py-0.5 rounded-md bg-accent-light text-accent text-[11px] font-bold">YOU</span>}
                </div>
                <p className="text-xs text-foreground-secondary">Active Player • {totalMultiplayerGames} multiplayer matches recorded</p>

                {/* Compare with Me Action */}
                {!isCurrentUser && currentUser && onCompareWithMe && (
                  <button
                    onClick={() => {
                      onCompareWithMe(profile.username);
                      onClose();
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-md hover:from-sky-600 hover:to-blue-700 transition-all hover:scale-105"
                  >
                    <span>⚔️ Compare Rivalry with Me</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Aggregate Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-background border border-border/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Total 1v1 Wins</span>
                <p className="text-xl font-black text-sky-400 mt-0.5">{totalMultiplayerWins}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-border/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">PvP Win Rate</span>
                <p className="text-xl font-black text-emerald-400 mt-0.5">{overallWinRate}%</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-border/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">2048 Best</span>
                <p className="text-xl font-black text-amber-400 mt-0.5">{profile.bestScore2048 > 0 ? profile.bestScore2048.toLocaleString() : '-'}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-border/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Aim Trainer Best</span>
                <p className="text-xl font-black text-rose-400 mt-0.5">
                  {profile.aimTrainerBestScore > 0 ? `${profile.aimTrainerBestScore} pts` : '-'}
                </p>
              </div>
            </div>

            {/* Per Game Detailed Stats */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Game Records & Performance</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Caro */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span>⭕</span>
                    <span className="font-semibold text-foreground">Caro (5-in-a-row)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">
                      {profile.caroWins}W / {profile.caroTotal}G
                    </span>
                    <span className="text-foreground-muted ml-1.5">
                      ({profile.caroTotal > 0 ? Math.round((profile.caroWins / profile.caroTotal) * 100) : 0}%)
                    </span>
                  </div>
                </div>

                {/* Chess */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span>♟️</span>
                    <span className="font-semibold text-foreground">Chess</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">
                      {profile.chessWins || 0}W / {profile.chessTotal || 0}G
                    </span>
                    <span className="text-foreground-muted ml-1.5">
                      ({(profile.chessTotal || 0) > 0 ? Math.round(((profile.chessWins || 0) / profile.chessTotal) * 100) : 0}%)
                    </span>
                  </div>
                </div>

                {/* Battleship */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span>⚓</span>
                    <span className="font-semibold text-foreground">Battleship</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">
                      {profile.battleshipWins || 0}W / {profile.battleshipTotal || 0}G
                    </span>
                    <span className="text-foreground-muted ml-1.5">
                      ({(profile.battleshipTotal || 0) > 0 ? Math.round(((profile.battleshipWins || 0) / profile.battleshipTotal) * 100) : 0}%)
                    </span>
                  </div>
                </div>

                {/* Word Chain */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span>🔗</span>
                    <span className="font-semibold text-foreground">Word Chain</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">
                      {profile.wordchainWins}W / {profile.wordchainTotal}G
                    </span>
                    <span className="text-foreground-muted ml-1.5">
                      ({profile.wordchainTotal > 0 ? Math.round((profile.wordchainWins / profile.wordchainTotal) * 100) : 0}%)
                    </span>
                  </div>
                </div>

                {/* Monopoly */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span>🎲</span>
                    <span className="font-semibold text-foreground">Monopoly</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">
                      {profile.monopolyWins || 0}W / {profile.monopolyTotal || 0}G
                    </span>
                    <span className="text-foreground-muted ml-1.5">
                      ({(profile.monopolyTotal || 0) > 0 ? Math.round(((profile.monopolyWins || 0) / profile.monopolyTotal) * 100) : 0}%)
                    </span>
                  </div>
                </div>

                {/* Minesweeper */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span>💣</span>
                    <span className="font-semibold text-foreground">Minesweeper</span>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    Beg: <strong className="text-foreground">{formatTime(profile.msBestBeginner)}</strong> • Exp:{' '}
                    <strong className="text-foreground">{formatTime(profile.msBestExpert)}</strong>
                  </div>
                </div>

                {/* Sudoku */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span>🔢</span>
                    <span className="font-semibold text-foreground">Sudoku</span>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    Easy: <strong className="text-foreground">{formatTime(profile.sudokuBestEasy)}</strong> • Hard:{' '}
                    <strong className="text-foreground">{formatTime(profile.sudokuBestHard)}</strong>
                  </div>
                </div>

                {/* T-Rex & Wordle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span>🦖</span>
                    <span className="font-semibold text-foreground">T-Rex / Wordle</span>
                  </div>
                  <div className="text-right font-mono text-[11px]">
                    T-Rex: <strong className="text-foreground">{profile.bestScoreTrex || 0}</strong> • Wordle:{' '}
                    <strong className="text-foreground">
                      {profile.wordleWins || 0}W
                      {profile.wordleTotal
                        ? ` / ${profile.wordleTotal} (${Math.round(((profile.wordleWins || 0) / profile.wordleTotal) * 100)}%)`
                        : ''}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Match Feed */}
            {recentMatches.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Recent Match Activity</h4>
                <div className="space-y-1.5">
                  {recentMatches.map((m: any) => {
                    const myPlayer = m.players?.find((p: any) => p.username.toLowerCase() === username.toLowerCase());
                    const isWin = myPlayer?.result === 'win';
                    const isDraw = myPlayer?.result === 'draw';

                    return (
                      <div key={m._id} className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              isWin
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : isDraw
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {myPlayer?.result || 'Played'}
                          </span>
                          <span className="font-semibold text-foreground capitalize">{m.gameType}</span>
                          {/* Game Specific Details */}
                          {m.gameType === 'wordle' && m.gameData?.solution ? (
                            <span className="text-[11px] font-mono">
                              {isWin ? (
                                <span className="text-emerald-400">
                                  "{m.gameData.solution.toUpperCase()}" ({m.gameData.guessesCount || 1}/6)
                                </span>
                              ) : (
                                <span className="text-rose-400">Word: "{m.gameData.solution.toUpperCase()}"</span>
                              )}
                            </span>
                          ) : m.gameType === 'minesweeper' || m.gameType === 'sudoku' ? (
                            <span className="text-[11px] font-mono text-foreground-secondary">
                              {isWin ? (
                                <span>
                                  {capitalize(m.gameData?.difficulty || 'Normal')} •{' '}
                                  {formatTime(m.gameData?.time || m.duration || myPlayer?.score || 0)}
                                </span>
                              ) : (
                                <span>{capitalize(m.gameData?.difficulty || 'Normal')}</span>
                              )}
                            </span>
                          ) : m.gameType === '2048' || m.gameType === 'trex' || m.gameType === 'aimtrainer' ? (
                            <span className="text-[11px] font-mono text-foreground-secondary">
                              {(myPlayer?.score ?? m.gameData?.score ?? 0).toLocaleString()} pts
                            </span>
                          ) : (
                            <span className="text-foreground-muted text-[11px]">
                              vs{' '}
                              {m.players
                                ?.filter((p: any) => p.username.toLowerCase() !== username.toLowerCase())
                                .map((p: any) => p.username)
                                .join(', ') || 'Solo'}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-foreground-muted">{new Date(m.createdAt).toLocaleDateString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
