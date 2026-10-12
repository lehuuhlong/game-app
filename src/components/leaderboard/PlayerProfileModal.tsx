'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth';

interface PlayerProfileData {
  _id?: string;
  id?: string;
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
  bestScoreFlappy?: number;
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
  billiardsWins: number;
  billiardsTotal: number;
  pikachuBestScore?: number;
  pikachuHighestLevel?: number;
  bestScoreLine98?: number;
  bestScoreNeonSnake?: number;
  bestScoreBlockDrop?: number;
  bestScoreEggPop?: number;
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
  const { user: currentUser, logout, changeUsername, updateAvatar } = useAuth();

  // Check if viewing profile of current logged-in user
  const isCurrentUser = Boolean(
    currentUser &&
      username &&
      currentUser.username.trim().toLowerCase() === username.trim().toLowerCase()
  );

  // Initialize profile with currentUser if viewing own profile for zero loading flicker
  const [profile, setProfile] = useState<PlayerProfileData | null>(() => {
    if (currentUser && username && currentUser.username.trim().toLowerCase() === username.trim().toLowerCase()) {
      return currentUser as unknown as PlayerProfileData;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    return !(currentUser && username && currentUser.username.trim().toLowerCase() === username.trim().toLowerCase());
  });
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'arcade' | 'pvp'>('all');

  // Editing state for profile owner
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editError, setEditError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!username) return;
    let active = true;

    if (!isCurrentUser) {
      setLoading(true);
    }

    async function fetchUserData() {
      try {
        const [userRes, matchesRes] = await Promise.all([
          fetch(`/api/users?username=${encodeURIComponent(username!)}`),
          fetch(`/api/matches?username=${encodeURIComponent(username!)}&limit=10`),
        ]);

        const userData = await userRes.json();
        const matchesData = await matchesRes.json();

        if (active) {
          const matchedUser =
            userData.user ||
            userData.users?.find(
              (u: any) => u.username?.toLowerCase() === username?.toLowerCase()
            );

          if (matchedUser) {
            if (isCurrentUser && currentUser) {
              setProfile({
                ...matchedUser,
                bestScoreEggPop: Math.max(matchedUser.bestScoreEggPop ?? 0, currentUser.bestScoreEggPop ?? 0),
                bestScoreBlockDrop: Math.max(matchedUser.bestScoreBlockDrop ?? 0, currentUser.bestScoreBlockDrop ?? 0),
                bestScoreLine98: Math.max(matchedUser.bestScoreLine98 ?? 0, currentUser.bestScoreLine98 ?? 0),
                bestScoreNeonSnake: Math.max(matchedUser.bestScoreNeonSnake ?? 0, currentUser.bestScoreNeonSnake ?? 0),
                bestScore2048: Math.max(matchedUser.bestScore2048 ?? 0, currentUser.bestScore2048 ?? 0),
                bestScoreTrex: Math.max(matchedUser.bestScoreTrex ?? 0, currentUser.bestScoreTrex ?? 0),
                bestScoreFlappy: Math.max(matchedUser.bestScoreFlappy ?? 0, currentUser.bestScoreFlappy ?? 0),
                pikachuBestScore: Math.max(matchedUser.pikachuBestScore ?? 0, currentUser.pikachuBestScore ?? 0),
              });
            } else {
              setProfile(matchedUser);
            }
          }
          setRecentMatches(matchesData.matches || []);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchUserData();

    const handleProfileUpdated = () => {
      fetchUserData();
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdated);

    return () => {
      active = false;
      window.removeEventListener('userProfileUpdated', handleProfileUpdated);
    };
  }, [username, isCurrentUser, currentUser]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingName) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, editingName]);

  // Lock body scroll while modal is open (never modify documentElement to prevent mobile viewport jump)
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Prevent desktop scrollbar flicker
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    document.body.style.overflow = 'hidden';

    // Pause Lenis smooth scroll if present
    window.dispatchEvent(new CustomEvent('lenis:stop'));

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.dispatchEvent(new CustomEvent('lenis:start'));
    };
  }, []);

  const handleAvatarFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 1_000_000) {
        alert('Image must be under 1 MB');
        return;
      }
      setUploadingAvatar(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await updateAvatar(base64);
        if (result.error) {
          alert(result.error);
        } else {
          setProfile((prev) => (prev ? { ...prev, avatarUrl: base64 } : null));
        }
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [updateAvatar]
  );

  const handleSaveName = async () => {
    setEditError('');
    const trimmed = newName.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setEditError('Username cannot be empty');
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 20) {
      setEditError('Username must be between 2 and 20 characters');
      return;
    }
    setSavingName(true);
    const result = await changeUsername(trimmed);
    setSavingName(false);
    if (result.error) {
      setEditError(result.error);
    } else {
      setEditingName(false);
      setProfile((prev) => (prev ? { ...prev, username: trimmed } : null));
    }
  };

  if (!username) return null;

  const totalMultiplayerWins =
    (profile?.caroWins || 0) +
    (profile?.chessWins || 0) +
    (profile?.battleshipWins || 0) +
    (profile?.wordchainWins || 0) +
    (profile?.monopolyWins || 0) +
    (profile?.billiardsWins || 0);

  const totalMultiplayerGames =
    (profile?.caroTotal || 0) +
    (profile?.chessTotal || 0) +
    (profile?.battleshipTotal || 0) +
    (profile?.wordchainTotal || 0) +
    (profile?.monopolyTotal || 0) +
    (profile?.billiardsTotal || 0);

  const overallWinRate =
    totalMultiplayerGames > 0
      ? Math.round((totalMultiplayerWins / totalMultiplayerGames) * 100)
      : 0;

  return (
    <div
      ref={backdropRef}
      data-lenis-prevent
      className="fixed inset-0 z-50 overflow-y-auto overscroll-y-contain bg-black/60 dark:bg-black/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center min-h-[100dvh]"
      onClick={onClose}
    >
      <motion.div
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className="w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-border bg-surface shadow-2xl p-4 sm:p-7 relative overflow-hidden max-h-[85dvh] sm:max-h-[88dvh] flex flex-col my-auto"
      >
        {/* Top-right action buttons */}
        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-2 z-10">
          {isCurrentUser && (
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all hover:scale-102 cursor-pointer shadow-xs"
              title="Log out"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Log out</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
            title="Close"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-xs text-foreground-muted">Loading player profile...</p>
          </div>
        ) : !profile ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-4xl">🕵️‍♂️</div>
            <h3 className="text-lg font-bold text-foreground">Player Not Found</h3>
            <p className="text-xs text-foreground-muted">
              Could not retrieve stats for player &quot;{username}&quot;.
            </p>
          </div>
        ) : (
          <div data-lenis-prevent className="overflow-y-auto overscroll-contain no-scrollbar space-y-5 sm:space-y-6 flex-1 min-h-0 pr-0.5">
            {/* Header Profile Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 pt-1 sm:pt-0">
              {/* Avatar + change button if current user */}
              <div className="relative group shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.username}
                    className="h-18 w-18 sm:h-20 sm:w-20 rounded-2xl object-cover ring-4 ring-accent/20 shadow-md"
                  />
                ) : (
                  <div className="flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-2xl font-black text-white shadow-md">
                    {profile.username[0]?.toUpperCase()}
                  </div>
                )}

                {isCurrentUser && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-2xl bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                      title="Change avatar (Max 1MB)"
                    >
                      {uploadingAvatar ? (
                        <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                          <span className="text-[10px] font-semibold mt-0.5">Change</span>
                        </>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFile}
                    />
                  </>
                )}
              </div>

              {/* Username + Bio/Actions */}
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                {editingName ? (
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') {
                            setEditingName(false);
                            setEditError('');
                          }
                        }}
                        placeholder="New username..."
                        maxLength={20}
                        className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground focus:border-accent focus:outline-none w-52 shadow-inner"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={savingName}
                        className="rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white hover:bg-accent/90 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                      >
                        {savingName ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false);
                          setEditError('');
                        }}
                        className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    {editError && (
                      <p className="text-xs text-rose-500 font-medium">{editError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                      {profile.username}
                    </h2>
                    {isCurrentUser && (
                      <>
                        <span className="px-2 py-0.5 rounded-md bg-accent-light text-accent text-[11px] font-bold">
                          YOU
                        </span>
                        <button
                          onClick={() => {
                            setEditingName(true);
                            setNewName(profile.username);
                            setEditError('');
                          }}
                          className="p-1 rounded-lg text-foreground-muted hover:text-accent hover:bg-surface-hover transition-colors cursor-pointer"
                          title="Change username"
                          aria-label="Change username"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                )}

                <p className="text-xs text-foreground-secondary">
                  Active Player • {totalMultiplayerGames} multiplayer matches recorded
                </p>

                {/* Compare with Me Action for rivalries */}
                {!isCurrentUser && currentUser && onCompareWithMe && (
                  <button
                    onClick={() => {
                      onCompareWithMe(profile.username);
                      onClose();
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-md hover:from-sky-600 hover:to-blue-700 transition-all hover:scale-105 cursor-pointer"
                  >
                    <span>⚔️ Compare Rivalry with Me</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Aggregate Stats Grid - Prominently Featuring Dino Egg Pop */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 sm:p-3.5 rounded-2xl bg-background border border-border/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  Total 1v1 Wins
                </span>
                <p className="text-xl font-black text-sky-400 mt-0.5">{totalMultiplayerWins}</p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl bg-background border border-border/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  PvP Win Rate
                </span>
                <p className="text-xl font-black text-emerald-400 mt-0.5">{overallWinRate}%</p>
              </div>

              {/* Dino Egg Pop High Score Highlight Card */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/30 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <span>🦕</span> Egg Pop Best
                </span>
                <p className="text-xl font-black text-emerald-400 mt-0.5">
                  {(profile.bestScoreEggPop ?? 0) > 0 ? (profile.bestScoreEggPop ?? 0).toLocaleString() : '-'}
                </p>
              </div>

              {/* Retro Block Drop / 2048 Arcade Highlight */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/30 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 dark:text-amber-400 flex items-center justify-center gap-1">
                  <span>🧱</span> Block Drop Best
                </span>
                <p className="text-xl font-black text-amber-400 mt-0.5">
                  {(profile.bestScoreBlockDrop ?? 0) > 0
                    ? (profile.bestScoreBlockDrop ?? 0).toLocaleString()
                    : (profile.bestScore2048 || 0) > 0
                    ? (profile.bestScore2048 || 0).toLocaleString()
                    : '-'}
                </p>
              </div>
            </div>

            {/* Per Game Detailed Stats with Category Tabs */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                  Game Records & Performance
                </h4>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-background border border-border/80 w-fit">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-surface text-foreground shadow-xs'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    All Games (15)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('arcade')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === 'arcade'
                        ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 shadow-xs'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <span>🦕</span>
                    <span>Arcade & Solo (9)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('pvp')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === 'pvp'
                        ? 'bg-sky-500/15 text-sky-500 dark:text-sky-400 border border-sky-500/30 shadow-xs'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <span>⚔️</span>
                    <span>1v1 PvP (6)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* ─── SOLO & ARCADE GAMES ─── */}
                {(activeTab === 'all' || activeTab === 'arcade') && (
                  <>
                    {/* Dino Egg Pop (Prominently Styled) */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-emerald-500/30 bg-emerald-500/5 text-xs shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🦕</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">Dino Egg Pop</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400">
                              Bubble Pop
                            </span>
                          </div>
                          <span className="text-[10px] text-foreground-muted">Arcade bubble shooter</span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-sm font-black text-emerald-400">
                          {(profile.bestScoreEggPop || 0).toLocaleString()}{' '}
                          <span className="text-[10px] font-bold">PTS</span>
                        </div>
                      </div>
                    </div>

                    {/* Retro Block Drop */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-amber-500/30 bg-amber-500/5 text-xs shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🧱</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">Retro Block Drop</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-400">
                              Tetris
                            </span>
                          </div>
                          <span className="text-[10px] text-foreground-muted">Classic falling blocks</span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-sm font-black text-amber-400">
                          {(profile.bestScoreBlockDrop || 0).toLocaleString()}{' '}
                          <span className="text-[10px] font-bold">PTS</span>
                        </div>
                      </div>
                    </div>

                    {/* Pikachu */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span>⚡</span>
                        <span className="font-semibold text-foreground">Pikachu Onet</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        Best: <strong className="text-foreground">{profile.pikachuBestScore?.toLocaleString() || 0} pts</strong> • Max:{' '}
                        <strong className="text-foreground">Level {profile.pikachuHighestLevel || 1}</strong>
                      </div>
                    </div>

                    {/* Neon Snake */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span>🐍</span>
                        <span className="font-semibold text-foreground">Neon Snake</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        Best: <strong className="text-foreground">{profile.bestScoreNeonSnake?.toLocaleString() || 0} pts</strong>
                      </div>
                    </div>

                    {/* Line 98 */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span>🔮</span>
                        <span className="font-semibold text-foreground">Line 98 Color Lines</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        Best: <strong className="text-foreground">{profile.bestScoreLine98?.toLocaleString() || 0} pts</strong>
                      </div>
                    </div>

                    {/* 2048 */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span>🔢</span>
                        <span className="font-semibold text-foreground">2048</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        Best: <strong className="text-foreground">{profile.bestScore2048?.toLocaleString() || 0} pts</strong> • Tile:{' '}
                        <strong className="text-amber-400">{profile.highest2048Tile || 0}</strong>
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
                        <span>🧩</span>
                        <span className="font-semibold text-foreground">Sudoku</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        Easy: <strong className="text-foreground">{formatTime(profile.sudokuBestEasy)}</strong> • Hard:{' '}
                        <strong className="text-foreground">{formatTime(profile.sudokuBestHard)}</strong>
                      </div>
                    </div>

                    {/* T-Rex & Flappy Bird */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span>🦖</span>
                        <span className="font-semibold text-foreground">T-Rex & Flappy</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        T-Rex: <strong className="text-foreground">{profile.bestScoreTrex || 0}</strong> • Flappy:{' '}
                        <strong className="text-foreground">{profile.bestScoreFlappy || 0}</strong>
                      </div>
                    </div>

                    {/* Aim Trainer & Wordle */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span>🎯</span>
                        <span className="font-semibold text-foreground">Aim Trainer & Wordle</span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        Aim: <strong className="text-foreground">{profile.aimTrainerBestScore || 0} pts</strong> • Wordle:{' '}
                        <strong className="text-foreground">{profile.wordleWins || 0}W</strong>
                      </div>
                    </div>
                  </>
                )}

                {/* ─── 1V1 MULTIPLAYER PVP GAMES ─── */}
                {(activeTab === 'all' || activeTab === 'pvp') && (
                  <>
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

                    {/* 8 Ball Pool */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-background-secondary border border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span>🎱</span>
                        <span className="font-semibold text-foreground">8 Ball Pool</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground">
                          {profile.billiardsWins || 0}W / {profile.billiardsTotal || 0}G
                        </span>
                        <span className="text-foreground-muted ml-1.5">
                          ({(profile.billiardsTotal || 0) > 0 ? Math.round(((profile.billiardsWins || 0) / profile.billiardsTotal) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Recent Match Feed */}
            {recentMatches.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
                  Recent Match Activity ({recentMatches.length})
                </h4>
                <div className="space-y-1.5">
                  {recentMatches.map((m: any) => {
                    const myPlayer = m.players?.find(
                      (p: any) =>
                        (profile?._id && p.userId && p.userId.toString() === profile._id.toString()) ||
                        (profile?.id && p.userId && p.userId.toString() === profile.id.toString()) ||
                        p.username === username
                    );
                    const isWin = myPlayer?.result === 'win';
                    const isDraw = myPlayer?.result === 'draw';
                    const isScoreGame = [
                      '2048',
                      'pikachu',
                      'trex',
                      'flappybird',
                      'aimtrainer',
                      'line98',
                      'neonsnake',
                      'blockdrop',
                      'eggpop',
                    ].includes(m.gameType);

                    return (
                      <div
                        key={m._id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/60 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          {isScoreGame ? (
                            <span className="px-2 py-0.5 rounded-md font-bold text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              {(myPlayer?.score ?? m.gameData?.score ?? 0).toLocaleString()} PTS
                            </span>
                          ) : (
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
                          )}
                          <span className="font-semibold text-foreground capitalize">
                            {m.gameType === 'pikachu'
                              ? 'Pikachu'
                              : m.gameType === 'line98'
                              ? 'Line 98'
                              : m.gameType === 'neonsnake'
                              ? 'Neon Snake'
                              : m.gameType === 'blockdrop'
                              ? 'Retro Block Drop'
                              : m.gameType === 'eggpop'
                              ? 'Dino Egg Pop'
                              : m.gameType}
                          </span>
                          {/* Game Specific Details */}
                          {m.gameType === 'wordle' && m.gameData?.solution ? (
                            <span className="text-[11px] font-mono">
                              {isWin ? (
                                <span className="text-emerald-400">
                                  &quot;{m.gameData.solution.toUpperCase()}&quot; ({m.gameData.guessesCount || 1}/6)
                                </span>
                              ) : (
                                <span className="text-rose-400">
                                  Word: &quot;{m.gameData.solution.toUpperCase()}&quot;
                                </span>
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
                          ) : m.gameType === '2048' ||
                            m.gameType === 'pikachu' ||
                            m.gameType === 'trex' ||
                            m.gameType === 'flappybird' ||
                            m.gameType === 'aimtrainer' ||
                            m.gameType === 'line98' ||
                            m.gameType === 'neonsnake' ||
                            m.gameType === 'blockdrop' ||
                            m.gameType === 'eggpop' ? (
                            <span className="text-[11px] font-mono text-foreground-secondary">
                              {(myPlayer?.score ?? m.gameData?.score ?? 0).toLocaleString()} pts
                              {m.gameType === 'eggpop' && m.gameData?.level
                                ? ` • Lvl ${m.gameData.level}`
                                : ''}
                              {m.gameType === 'pikachu' && m.gameData?.level
                                ? ` • Lvl ${m.gameData.level}`
                                : ''}
                              {m.gameType === 'line98' && m.gameData?.moveCount
                                ? ` • ${m.gameData.moveCount} moves`
                                : ''}
                              {m.gameType === 'blockdrop' && m.gameData?.lines
                                ? ` • ${m.gameData.lines} lines`
                                : ''}
                            </span>
                          ) : (
                            <span className="text-foreground-muted text-[11px]">
                              vs{' '}
                              {m.players
                                ?.filter(
                                  (p: any) => p.username !== username
                                )
                                .map((p: any) => p.username)
                                .join(', ') || 'Solo'}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-foreground-muted">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </span>
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
