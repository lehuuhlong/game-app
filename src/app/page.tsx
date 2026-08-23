'use client';

import { GAMES, type GameInfo } from '@/config/games';
import { Hero3D } from '@/components/landing/Hero3D';
import { SmoothScroll } from '@/components/landing/SmoothScroll';
import { useTheme } from '@/components/shared/ThemeProvider';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Completed 7 games for The Arcade Bento
const ARCADE_GAMES = GAMES.filter((g) =>
  ['2048', 'caro', 'minesweeper', 'wordle', 'sudoku', 'trex', 'chess'].includes(g.id)
);

// Coming Soon games
const UPCOMING_GAMES = [
  {
    id: 'aimtrainer',
    title: 'Aim Trainer',
    description: 'Precision reflex testing and target tracking engine. Benchmark your reaction time down to the millisecond with global ELO ladders.',
    badge: 'Precision Reflexes',
    eta: 'Q3 2026',
    status: 'In Active Engine Build',
    icon: '🎯',
    color: 'from-sky-500/20 via-sky-500/5 to-transparent',
    borderColor: 'group-hover:border-sky-500/50',
    tagColor: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  },
  {
    id: 'battleship',
    title: 'Battleship',
    description: '1v1 naval warfare strategy. Deploy your fleet in secrecy, calculate coordinate strikes, and sink enemy armadas over real-time WebSockets.',
    badge: '1v1 Tactical Naval',
    eta: 'Q3 2026',
    status: 'Multiplayer Netcode Phase',
    icon: '🚢',
    color: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
    borderColor: 'group-hover:border-cyan-500/50',
    tagColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  },
];

// Magnetic Button Component for Hero CTA
function MagneticButton({
  children,
  onClick,
  href,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 250, damping: 18, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!buttonRef.current) return;
    const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;

    x.set(distanceX * 0.35);
    y.set(distanceY * 0.35);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const content = (
    <motion.div
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <div onClick={onClick}>{content}</div>;
}

// 3D Parallax Tilt Bento Card Component
function TiltBentoCard({
  children,
  className = '',
  maxTilt = 12,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [maxTilt, -maxTilt]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-maxTilt, maxTilt]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={`relative will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { theme, mounted } = useTheme();
  const isDark = mounted ? theme === 'dark' : true;

  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedMultiGame, setSelectedMultiGame] = useState('caro');

  // Real-time online players socket listener
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    socket.on('online_players_count', (count: number) => {
      setOnlinePlayers(count);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleQuickJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) return;
    router.push(`/games/${selectedMultiGame}?room=${cleanCode}`);
  };

  return (
    <SmoothScroll>
      <div className="relative min-h-screen selection:bg-accent selection:text-white bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
        {/* ── 1. HERO SECTION (THE HOOK) ────────────────────────────── */}
        <section className="relative h-screen w-full flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
          {/* Interactive 3D WebGL Canvas */}
          <Hero3D isDark={isDark} />

          {/* Foreground Kinetic Editorial */}
          <div className="relative z-10 max-w-4xl mx-auto space-y-8 flex flex-col items-center">
            {/* Telemetry Status Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-3 rounded-full border border-border bg-surface/80 backdrop-blur-2xl px-5 py-2 text-xs font-mono font-medium text-foreground-secondary shadow-xl"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </span>
              <span className="text-foreground font-bold">{onlinePlayers !== null ? `${onlinePlayers} Players Live` : 'Engine Active'}</span>
              <span className="text-border">/</span>
              <span className="text-accent font-bold">7 Completed Games</span>
              <span className="text-border">/</span>
              <span className="text-foreground-muted">2 In Development</span>
            </motion.div>

            {/* Kinetic Typography Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-2"
            >
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.04] text-foreground">
                Next-Gen <span className="text-gradient">Browser</span> Gaming.
              </h1>
              <p className="text-base sm:text-xl text-foreground-secondary font-normal max-w-2xl mx-auto leading-relaxed pt-2">
                Minimalist, butter-smooth, and deterministic. Challenge friends in real-time WebSockets or solve pure logic puzzles with zero friction.
              </p>
            </motion.div>

            {/* Magnetic CTA & Direct Actions */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center justify-center gap-4 pt-4"
            >
              <MagneticButton href="#arcade">
                <div className="h-14 px-9 rounded-2xl bg-accent text-white font-bold text-base flex items-center justify-center gap-3 shadow-xl shadow-accent/25 hover:bg-accent-hover hover:shadow-2xl hover:shadow-accent/40 transition-all duration-200 active:scale-95 cursor-pointer">
                  <span>Play Now</span>
                  <span className="text-lg">→</span>
                </div>
              </MagneticButton>

              <MagneticButton href="https://github.com/lehuuhlong/game-app">
                <div className="h-14 px-7 rounded-2xl border border-border bg-surface/80 backdrop-blur-xl text-foreground font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-surface-hover hover:border-border-hover transition-all duration-200 shadow-md cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>Star on GitHub</span>
                </div>
              </MagneticButton>
            </motion.div>

            {/* Quick 6-character room token joiner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md pt-2"
            >
              <form
                onSubmit={handleQuickJoinRoom}
                className="p-2 rounded-2xl border border-border bg-surface/80 backdrop-blur-2xl flex items-center gap-2 shadow-2xl"
              >
                <select
                  value={selectedMultiGame}
                  onChange={(e) => setSelectedMultiGame(e.target.value)}
                  aria-label="Direct join game selector"
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                >
                  <option value="caro">Caro (Gomoku)</option>
                  <option value="chess">Chess 1v1</option>
                  <option value="monopoly">Monopoly</option>
                </select>

                <input
                  type="text"
                  maxLength={8}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  aria-label="Direct room token"
                  className="flex-1 min-w-0 bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-foreground placeholder:text-foreground-muted placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-accent uppercase tracking-widest"
                />

                <button
                  type="submit"
                  disabled={!roomCodeInput.trim()}
                  aria-label="Join game room"
                  className="h-8 px-4 rounded-xl bg-accent text-white text-xs font-bold whitespace-nowrap hover:bg-accent-hover disabled:opacity-40 transition-all active:scale-95 shadow-md"
                >
                  Join
                </button>
              </form>
            </motion.div>
          </div>

          {/* Scroll Down Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground-muted text-xs font-mono"
          >
            <span>SCROLL TO EXPLORE</span>
            <div className="w-5 h-8 rounded-full border border-border flex items-start justify-center p-1">
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1 h-2 rounded-full bg-accent"
              />
            </div>
          </motion.div>
        </section>

        {/* ── 2. THE ARCADE (COMPLETED GAMES BENTO BOX) ──────────────── */}
        <section id="arcade" className="relative z-10 px-4 py-28 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-accent mb-2">
                <span>//</span> Active Roster
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
                The Arcade
              </h2>
              <p className="mt-2 text-base text-foreground-secondary max-w-xl">
                Seven production-ready browser games engineered with zero latency, accessible controls, and dark mode aesthetics.
              </p>
            </div>

            <Link
              href="/games"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline self-start sm:self-auto"
            >
              <span>Explore All Modules</span>
              <span>→</span>
            </Link>
          </div>

          {/* Bento Box Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[280px]">
            {ARCADE_GAMES.map((game, index) => {
              // Asymmetric Bento sizing: first and fourth games span 2 columns
              const isLarge = index === 0 || index === 3;
              return (
                <TiltBentoCard
                  key={game.id}
                  maxTilt={10}
                  className={isLarge ? 'md:col-span-2' : 'col-span-1'}
                >
                  <Link href={game.route} className="block group h-full">
                    <div className="relative h-full rounded-3xl border border-border bg-surface/90 hover:bg-surface-hover hover:border-accent/50 p-7 flex flex-col justify-between transition-all duration-300 shadow-xl overflow-hidden group-hover:shadow-2xl group-hover:shadow-accent/10">
                      {/* Ambient Glowing Border Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      <div>
                        {/* Header: Icon & Player Badge */}
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <div className="h-10 w-10 rounded-2xl bg-background border border-border flex items-center justify-center text-xl shadow-inner">
                            {game.id === '2048'
                              ? '🔢'
                              : game.id === 'caro'
                              ? '⭕'
                              : game.id === 'minesweeper'
                              ? '💣'
                              : game.id === 'wordle'
                              ? '🟩'
                              : game.id === 'sudoku'
                              ? '🧩'
                              : game.id === 'trex'
                              ? '🦖'
                              : '♟️'}
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-background border border-border text-foreground-secondary">
                            {game.minPlayers === game.maxPlayers ? `${game.minPlayers}P` : `${game.minPlayers}-${game.maxPlayers}P`}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-2xl font-black text-foreground group-hover:text-accent transition-colors mb-2 relative z-10">
                          {game.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-foreground-secondary leading-relaxed line-clamp-2 relative z-10">
                          {game.description}
                        </p>
                      </div>

                      {/* Footer: Tags & Action Arrow */}
                      <div className="pt-4 border-t border-border flex items-center justify-between relative z-10">
                        <div className="flex flex-wrap gap-1.5">
                          {game.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-md bg-background border border-border text-xs font-mono font-medium text-foreground-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="h-8 w-8 rounded-xl bg-background border border-border flex items-center justify-center text-foreground group-hover:bg-accent group-hover:text-white group-hover:border-accent transition-all duration-200">
                          →
                        </div>
                      </div>
                    </div>
                  </Link>
                </TiltBentoCard>
              );
            })}
          </div>
        </section>

        {/* ── 3. COMING SOON (TEASER SECTION) ────────────────────────── */}
        <section className="relative z-10 px-4 py-28 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-border">
          {/* Scroll-Triggered Reveal Header */}
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-2xl mx-auto mb-16 space-y-3"
          >
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-accent">
              <span>//</span> Under Construction
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
              Coming Soon
            </h2>
            <p className="text-base text-foreground-secondary font-normal">
              Two high-intensity gameplay modules currently entering final netcode verification and testing.
            </p>
          </motion.div>

          {/* Teaser Cards with Staggered whileInView */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {UPCOMING_GAMES.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.8, delay: i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="group relative rounded-3xl border border-border bg-surface/90 p-8 sm:p-10 shadow-2xl overflow-hidden hover:border-accent/40 transition-all duration-300"
              >
                {/* Background Ambient Radial Aura */}
                <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-30 pointer-events-none`} />

                <div className="relative z-10 space-y-6">
                  {/* Top Bar: Icon, Badge, and ETA */}
                  <div className="flex items-center justify-between">
                    <div className="h-14 w-14 rounded-2xl bg-background border border-border flex items-center justify-center text-3xl shadow-inner">
                      {game.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${game.tagColor}`}>
                        {game.badge}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-surface border border-border text-foreground-secondary">
                        ETA: {game.eta}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-2xl sm:text-3xl font-black text-foreground group-hover:text-accent transition-colors">
                      {game.title}
                    </h3>
                    <p className="text-sm text-foreground-secondary leading-relaxed font-normal">
                      {game.description}
                    </p>
                  </div>

                  {/* Status Progress Bar */}
                  <div className="pt-4 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-foreground-muted">Engine Status:</span>
                      <span className="text-accent font-bold">{game.status}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-background overflow-hidden">
                      <motion.div
                        initial={{ width: '0%' }}
                        whileInView={{ width: i === 0 ? '78%' : '65%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
                        className="h-full rounded-full bg-accent"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── 4. MINIMALIST FOOTER ───────────────────────────────────── */}
        <footer className="relative z-10 border-t border-border bg-surface/50 backdrop-blur-2xl py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Branding & Vercel deployment badge */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <span className="text-lg font-black tracking-tight text-foreground">
                Game<span className="text-gradient">Portal</span>
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-background text-xs font-mono text-foreground-secondary">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Deployed on Vercel</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-background text-xs font-mono text-foreground-muted">
                <span>Next.js 14+</span>
              </div>
            </div>

            {/* Right: GitHub Source Code Link & Copyright */}
            <div className="flex items-center gap-6 text-xs font-mono text-foreground-secondary">
              <a
                href="https://github.com/lehuuhlong/game-app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-accent transition-colors font-bold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>github.com/lehuuhlong/game-app</span>
              </a>
              <span>© {new Date().getFullYear()} Hoang Long</span>
            </div>
          </div>
        </footer>
      </div>
    </SmoothScroll>
  );
}
