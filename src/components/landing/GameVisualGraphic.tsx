'use client';

import React from 'react';

interface GameVisualGraphicProps {
  id: string;
  className?: string;
}

/**
 * Bespoke dynamic SVG & CSS visual graphics for every game in the portal.
 * Seamlessly adapts between crisp, vibrant Light Mode and sleek, glowing Dark Mode.
 */
export function GameVisualGraphic({ id, className = '' }: GameVisualGraphicProps) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden select-none ${className}`}>
      {/* ── 1. FLAPPY BIRD ───────────────────────────────────────── */}
      {id === 'flappybird' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-200 dark:from-sky-500 dark:via-sky-600 dark:to-emerald-950">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Flappy Bird">
            <defs>
              <linearGradient id="flappy-pipe" x1="0" x2="1">
                <stop offset="0" stopColor="#15803d" />
                <stop offset="0.28" stopColor="#4ade80" />
                <stop offset="0.72" stopColor="#22c55e" />
                <stop offset="1" stopColor="#166534" />
              </linearGradient>
            </defs>
            {/* Clouds */}
            <g fill="white" opacity=".75">
              <ellipse cx="28" cy="23" rx="22" ry="7" />
              <ellipse cx="37" cy="17" rx="11" ry="10" />
              <ellipse cx="91" cy="37" rx="18" ry="6" />
              <ellipse cx="160" cy="20" rx="24" ry="8" />
            </g>
            {/* Pipes */}
            <g stroke="#14532d" strokeWidth="2.2" fill="url(#flappy-pipe)">
              <animateTransform attributeName="transform" type="translate" values="8 0;-8 0;8 0" dur="2.4s" repeatCount="indefinite" />
              <rect x="145" y="-4" width="35" height="40" />
              <rect x="140" y="32" width="45" height="12" rx="2" />
              <rect x="145" y="79" width="35" height="35" />
              <rect x="140" y="75" width="45" height="12" rx="2" />
            </g>
            {/* Bird */}
            <g>
              <animateTransform attributeName="transform" type="translate" values="58 58;58 52;58 58;58 62;58 58" dur="1.35s" repeatCount="indefinite" />
              <g transform="rotate(-8) scale(.5)">
                <ellipse cx="0" cy="0" rx="23" ry="18" fill="#f59e0b" stroke="#92400e" strokeWidth="2.5" />
                <g>
                  <animateTransform attributeName="transform" type="rotate" values="-14 -8 7;20 -8 7;-14 -8 7" dur=".38s" repeatCount="indefinite" />
                  <ellipse cx="-8" cy="7" rx="14" ry="9" fill="#fbbf24" stroke="#92400e" strokeWidth="2.5" />
                </g>
                <circle cx="10" cy="-7" r="8" fill="white" stroke="#92400e" strokeWidth="2.5" />
                <circle cx="13" cy="-7" r="3" fill="#111827" />
                <path d="M19 1 38 6 19 10Z" fill="#fb7185" stroke="#92400e" strokeWidth="2.5" strokeLinejoin="round" />
              </g>
            </g>
            {/* Ground */}
            <rect y="101" width="192" height="11" fill="#84cc16" />
            <rect y="101" width="192" height="4" fill="#d9f99d" />
            <path d="M0 110h192" stroke="#4d7c0f" strokeWidth="2" strokeDasharray="8 5" />
          </svg>
        </div>
      )}

      {/* ── 2. T-REX RUNNER ──────────────────────────────────────── */}
      {id === 'trex' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-emerald-100/80 via-teal-50 to-emerald-200/80 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="T-Rex Runner">
            {/* Sky Clouds & Moon */}
            <g className="fill-emerald-800/20 dark:fill-white/60">
              <circle cx="25" cy="18" r="1.5" />
              <circle cx="85" cy="12" r="1" />
              <circle cx="140" cy="22" r="1.5" />
              <circle cx="160" cy="18" r="6" className="fill-amber-400 dark:fill-slate-100" opacity="0.85" />
            </g>
            <g className="fill-emerald-900/15 dark:fill-slate-700/50">
              <animateTransform attributeName="transform" type="translate" values="10 0;-20 0;10 0" dur="4s" repeatCount="indefinite" />
              <rect x="40" y="28" width="22" height="5" rx="2.5" />
              <rect x="110" y="36" width="28" height="6" rx="3" />
            </g>
            {/* T-Rex Runner */}
            <g className="fill-emerald-700 dark:fill-emerald-400">
              <animateTransform attributeName="transform" type="translate" values="32 58;32 44;32 58" dur="1.1s" repeatCount="indefinite" />
              <g transform="scale(0.65)">
                <rect x="26" y="0" width="18" height="14" rx="2" />
                <rect x="34" y="6" width="12" height="10" rx="1" />
                <rect x="30" y="3" width="3" height="3" className="fill-emerald-100 dark:fill-slate-950" />
                <rect x="16" y="12" width="16" height="20" rx="2" />
                <rect x="10" y="20" width="18" height="16" rx="2" />
                <rect x="26" y="20" width="6" height="3" rx="1" />
                <rect x="2" y="18" width="10" height="8" rx="2" />
                <rect x="14" y="34" width="5" height="10" rx="1" />
                <rect x="22" y="34" width="5" height="10" rx="1" />
              </g>
            </g>
            {/* Cacti */}
            <g className="fill-emerald-600 dark:fill-emerald-500">
              <animateTransform attributeName="transform" type="translate" values="12 0;-16 0;12 0" dur="1.8s" repeatCount="indefinite" />
              <rect x="135" y="66" width="6" height="26" rx="2" />
              <rect x="130" y="73" width="6" height="4" rx="1" />
              <rect x="130" y="69" width="3" height="6" rx="1" />
              <rect x="139" y="76" width="6" height="4" rx="1" />
              <rect x="142" y="72" width="3" height="6" rx="1" />
            </g>
            {/* Ground Line */}
            <rect y="92" width="192" height="20" className="fill-emerald-300/40 dark:fill-slate-900" />
            <rect y="92" width="192" height="2" className="fill-emerald-600 dark:fill-emerald-500" />
            <path d="M0 98h192" className="stroke-emerald-700/40 dark:stroke-slate-600" strokeWidth="1.5" strokeDasharray="8 6" />
            {/* Score HUD */}
            <text x="140" y="14" className="fill-slate-600 dark:fill-slate-400" fontFamily="monospace" fontSize="7" fontWeight="bold">HI 09999</text>
            <text x="175" y="14" className="fill-emerald-700 dark:fill-emerald-400" fontFamily="monospace" fontSize="7" fontWeight="bold">0248</text>
          </svg>
        </div>
      )}

      {/* ── 3. 2048 ─────────────────────────────────────────────── */}
      {id === '2048' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-amber-100/90 via-orange-50 to-amber-200/80 dark:from-slate-950 dark:via-amber-950/40 dark:to-slate-950">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="2048">
            <rect x="24" y="12" width="144" height="88" rx="8" className="fill-amber-200/60 dark:fill-slate-800/80 stroke-amber-300 dark:stroke-slate-700" strokeWidth="1.5" />
            {/* Tile 128 */}
            <rect x="32" y="20" width="30" height="24" rx="4" fill="#64748b" />
            <text x="47" y="34" fill="#f1f5f9" fontFamily="sans-serif" fontWeight="900" fontSize="9" textAnchor="middle" dominantBaseline="middle">128</text>
            {/* Tile 512 */}
            <rect x="66" y="20" width="30" height="24" rx="4" fill="#ec4899" />
            <text x="81" y="34" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="9" textAnchor="middle" dominantBaseline="middle">512</text>
            {/* Tile 1024 */}
            <rect x="100" y="20" width="30" height="24" rx="4" fill="#ea580c" />
            <text x="115" y="34" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="8" textAnchor="middle" dominantBaseline="middle">1024</text>
            {/* Tile 64 */}
            <rect x="134" y="20" width="26" height="24" rx="4" fill="#f43f5e" />
            <text x="147" y="34" fill="#ffffff" fontFamily="sans-serif" fontWeight="900" fontSize="9" textAnchor="middle" dominantBaseline="middle">64</text>
            {/* Tile 2048 (Golden Star) */}
            <g transform="translate(32, 48)">
              <rect x="0" y="0" width="64" height="24" rx="5" fill="#f59e0b" stroke="#fde047" strokeWidth="1.5">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="1.8s" repeatCount="indefinite" />
              </rect>
              <text x="32" y="14" fill="#451a03" fontFamily="sans-serif" fontWeight="900" fontSize="12" textAnchor="middle" dominantBaseline="middle">2048</text>
              <polygon points="5,4 6,7 9,8 6,9 5,12 4,9 1,8 4,7" fill="#ffffff" />
            </g>
            {/* Tile 256 */}
            <rect x="100" y="48" width="30" height="24" rx="4" fill="#8b5cf6" />
            <text x="115" y="62" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="9" textAnchor="middle" dominantBaseline="middle">256</text>
            {/* Tile 32 */}
            <rect x="134" y="48" width="26" height="24" rx="4" fill="#f97316" />
            <text x="147" y="62" fill="#ffffff" fontFamily="sans-serif" fontWeight="900" fontSize="9" textAnchor="middle" dominantBaseline="middle">32</text>
            {/* Bottom Row */}
            <rect x="32" y="76" width="30" height="18" rx="3" className="fill-amber-300/80 dark:fill-slate-900" />
            <text x="47" y="86" className="fill-amber-950 dark:fill-slate-400" fontFamily="sans-serif" fontWeight="900" fontSize="8" textAnchor="middle" dominantBaseline="middle">2</text>
            <rect x="66" y="76" width="30" height="18" rx="3" className="fill-amber-300/80 dark:fill-slate-900" />
            <text x="81" y="86" className="fill-amber-950 dark:fill-slate-400" fontFamily="sans-serif" fontWeight="900" fontSize="8" textAnchor="middle" dominantBaseline="middle">4</text>
            <rect x="100" y="76" width="30" height="18" rx="3" fill="#38bdf8" />
            <text x="115" y="86" fill="#ffffff" fontFamily="sans-serif" fontWeight="900" fontSize="8" textAnchor="middle" dominantBaseline="middle">8</text>
            <rect x="134" y="76" width="26" height="18" rx="3" fill="#10b981" />
            <text x="147" y="86" fill="#ffffff" fontFamily="sans-serif" fontWeight="900" fontSize="8" textAnchor="middle" dominantBaseline="middle">16</text>
          </svg>
        </div>
      )}

      {/* ── 4. CHESS ────────────────────────────────────────────── */}
      {id === 'chess' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-amber-100/90 via-stone-50 to-amber-200/70 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950/50">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Chess">
            <g transform="translate(96, 68) scale(1, 0.52) rotate(45)">
              <rect x="-55" y="-55" width="110" height="110" rx="5" className="fill-amber-900/20 dark:fill-slate-800 stroke-amber-800/40 dark:stroke-slate-600" strokeWidth="3" />
              {/* Checkers */}
              <rect x="-45" y="-45" width="22" height="22" fill="#fffbeb" />
              <rect x="-23" y="-45" width="22" height="22" fill="#78350f" />
              <rect x="-1" y="-45" width="22" height="22" fill="#fffbeb" />
              <rect x="21" y="-45" width="22" height="22" fill="#78350f" />
              <rect x="-45" y="-23" width="22" height="22" fill="#78350f" />
              <rect x="-23" y="-23" width="22" height="22" fill="#38bdf8" fillOpacity="0.75" />
              <rect x="-1" y="-23" width="22" height="22" fill="#78350f" />
              <rect x="21" y="-23" width="22" height="22" fill="#fffbeb" />
              <rect x="-45" y="-1" width="22" height="22" fill="#fffbeb" />
              <rect x="-23" y="-1" width="22" height="22" fill="#78350f" />
              <rect x="-1" y="-1" width="22" height="22" fill="#38bdf8" fillOpacity="0.9" />
              <rect x="21" y="-1" width="22" height="22" fill="#78350f" />
            </g>
            {/* Gold King Piece */}
            <g transform="translate(96, 46)">
              <animateTransform attributeName="transform" type="translate" values="96 46;96 42;96 46" dur="2s" repeatCount="indefinite" />
              <path d="M-2 -24 H2 V-21 H-2 Z M-5 -23 H5 V-21 H-5 Z" fill="#fde047" />
              <path d="M-9 -19 C-9 -22 9 -22 9 -19 C8 -16 7 -13 8 -10 C5 -11 -5 -11 -8 -10 C-7 -13 -8 -16 -9 -19 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
              <path d="M-8 -10 C-8 -5 -5 9 -10 18 H10 C5 9 8 -5 8 -10 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
              <rect x="-12" y="18" width="24" height="5" rx="1.5" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
            </g>
            {/* Silver Knight (Left) */}
            <g transform="translate(54, 56) scale(0.65)">
              <path d="M-8 -18 C-4 -22 8 -20 10 -14 C12 -10 6 -6 8 -2 C6 6 8 14 10 18 H-10 C-8 12 -10 4 -8 -6 Z" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
              <rect x="-12" y="18" width="24" height="5" rx="1.5" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
            </g>
            {/* Silver Queen (Right) */}
            <g transform="translate(138, 56) scale(0.65)">
              <circle cx="-8" cy="-20" r="1.5" fill="#f8fafc" />
              <circle cx="0" cy="-22" r="2" fill="#f8fafc" />
              <circle cx="8" cy="-20" r="1.5" fill="#f8fafc" />
              <path d="M-8 -19 L-5 -12 L0 -20 L5 -12 L8 -19 C7 -10 6 8 10 18 H-10 C-6 8 -7 -10 -8 -19 Z" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
              <rect x="-12" y="18" width="24" height="5" rx="1.5" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
      )}

      {/* ── 5. MONOPOLY ─────────────────────────────────────────── */}
      {id === 'monopoly' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-emerald-100/90 via-teal-50 to-amber-100/80 dark:from-slate-950 dark:via-emerald-950/40 dark:to-slate-950">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Monopoly">
            <g transform="translate(96, 62) scale(1, 0.5) rotate(45)">
              <rect x="-50" y="-50" width="100" height="100" rx="5" fill="#ecfdf5" stroke="#047857" strokeWidth="3.5" />
              <rect x="-35" y="-35" width="70" height="70" fill="#d1fae5" stroke="#059669" strokeWidth="1.5" />
              {/* Properties */}
              <rect x="-35" y="-50" width="15" height="15" fill="#fee2e2" stroke="#dc2626" strokeWidth="0.8" />
              <rect x="-35" y="-50" width="15" height="5" fill="#ef4444" />
              <rect x="-20" y="-50" width="15" height="15" fill="#fee2e2" stroke="#dc2626" strokeWidth="0.8" />
              <rect x="-20" y="-50" width="15" height="5" fill="#ef4444" />
              <rect x="35" y="-35" width="15" height="15" fill="#fef3c7" stroke="#d97706" strokeWidth="0.8" />
              <rect x="45" y="-35" width="5" height="15" fill="#f59e0b" />
            </g>
            {/* Animated Dice */}
            <g transform="translate(74, 52) rotate(-10)">
              <animateTransform attributeName="transform" type="rotate" values="-10 74 52; -5 74 52; -10 74 52" dur="1.5s" repeatCount="indefinite" />
              <rect x="-13" y="-13" width="26" height="26" rx="5" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.8" />
              <circle cx="-6" cy="-6" r="2.5" fill="#0f172a" />
              <circle cx="-6" cy="6" r="2.5" fill="#0f172a" />
              <circle cx="6" cy="-6" r="2.5" fill="#0f172a" />
              <circle cx="6" cy="6" r="2.5" fill="#0f172a" />
            </g>
            <g transform="translate(116, 56) rotate(14)">
              <animateTransform attributeName="transform" type="rotate" values="14 116 56; 20 116 56; 14 116 56" dur="1.5s" repeatCount="indefinite" />
              <rect x="-12" y="-12" width="24" height="24" rx="5" fill="#f59e0b" stroke="#fde047" strokeWidth="1.8" />
              <circle cx="-5" cy="-5" r="2" fill="#451a03" />
              <circle cx="5" cy="-5" r="2" fill="#451a03" />
              <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
              <circle cx="-5" cy="5" r="2" fill="#451a03" />
              <circle cx="5" cy="5" r="2" fill="#451a03" />
            </g>
            {/* Cash Dollar Note */}
            <g transform="translate(42, 74) rotate(-20)">
              <rect x="-14" y="-8" width="28" height="16" rx="2" fill="#10b981" stroke="#059669" strokeWidth="1.2" />
              <text x="0" y="2.5" fill="white" fontFamily="sans-serif" fontWeight="900" fontSize="9" textAnchor="middle">$</text>
            </g>
          </svg>
        </div>
      )}

      {/* ── 6. CARO (GOMOKU) ─────────────────────────────────────── */}
      {id === 'caro' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-violet-100/90 via-indigo-50 to-purple-200/80 dark:from-slate-950 dark:via-violet-950/40 dark:to-slate-950">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Caro">
            <rect x="24" y="12" width="144" height="88" rx="8" className="fill-white/80 dark:fill-slate-900/90 stroke-violet-300 dark:stroke-slate-700" strokeWidth="1.5" />
            {/* Grid Lines */}
            <g className="stroke-violet-400/40 dark:stroke-slate-600/50" strokeWidth="1" strokeDasharray="2 3">
              <line x1="32" y1="34" x2="160" y2="34" />
              <line x1="32" y1="56" x2="160" y2="56" />
              <line x1="32" y1="78" x2="160" y2="78" />
              <line x1="56" y1="20" x2="56" y2="92" />
              <line x1="82" y1="20" x2="82" y2="92" />
              <line x1="108" y1="20" x2="108" y2="92" />
              <line x1="134" y1="20" x2="134" y2="92" />
            </g>
            {/* Laser Line */}
            <line x1="44" y1="56" x2="148" y2="56" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" opacity="0.65">
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.2s" repeatCount="indefinite" />
            </line>
            {/* O's and X's */}
            <circle cx="56" cy="34" r="7" stroke="#0284c7" strokeWidth="2.5" fill="rgba(56,189,248,0.2)" />
            <circle cx="134" cy="34" r="7" stroke="#0284c7" strokeWidth="2.5" fill="rgba(56,189,248,0.2)" />
            {[56, 82, 108, 134].map((x, i) => (
              <g key={i} transform={`translate(${x}, 56)`}>
                <line x1="-5" y1="-5" x2="5" y2="5" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
                <line x1="5" y1="-5" x2="-5" y2="5" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
              </g>
            ))}
            <circle cx="82" cy="78" r="7" stroke="#0284c7" strokeWidth="2.5" fill="rgba(56,189,248,0.2)" />
          </svg>
        </div>
      )}

      {/* ── 7. BATTLESHIP ────────────────────────────────────────── */}
      {id === 'battleship' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-sky-100/90 via-blue-50 to-cyan-200/80 dark:from-slate-950 dark:via-sky-950/60 dark:to-slate-950">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Battleship">
            {/* Grid */}
            <g className="stroke-sky-600/25 dark:stroke-sky-400/25" strokeWidth="0.8">
              <line x1="30" y1="0" x2="30" y2="112" />
              <line x1="60" y1="0" x2="60" y2="112" />
              <line x1="90" y1="0" x2="90" y2="112" />
              <line x1="120" y1="0" x2="120" y2="112" />
              <line x1="150" y1="0" x2="150" y2="112" />
              <line x1="0" y1="28" x2="192" y2="28" />
              <line x1="0" y1="56" x2="192" y2="56" />
              <line x1="0" y1="84" x2="192" y2="84" />
            </g>
            {/* Sonar Radar */}
            <g transform="translate(56, 56)">
              <circle cx="0" cy="0" r="38" className="stroke-sky-600/40 dark:stroke-sky-400/40" strokeWidth="1.2" />
              <circle cx="0" cy="0" r="24" className="stroke-sky-600/30 dark:stroke-sky-400/30" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M0 0 L26 -26 A38 38 0 0 1 38 0 Z" fill="#0284c7" fillOpacity="0.25">
                <animateTransform attributeName="transform" type="rotate" values="0;360" dur="4s" repeatCount="indefinite" />
              </path>
              <circle cx="16" cy="-12" r="2" fill="#0284c7" />
            </g>
            {/* Aircraft Carrier */}
            <g transform="translate(126, 46)">
              <path d="M-30 0 L26 -3 L32 0 L26 3 L-30 0 Z" className="fill-slate-700 dark:fill-slate-400" stroke="#334155" strokeWidth="1" />
              <line x1="-24" y1="0" x2="20" y2="0" stroke="#f8fafc" strokeWidth="1" strokeDasharray="4 3" />
              <rect x="5" y="-6" width="9" height="3" rx="0.5" className="fill-slate-800 dark:fill-slate-300" />
            </g>
            {/* Explosion Hit */}
            <g transform="translate(136, 44)">
              <circle cx="0" cy="0" r="10" stroke="#ef4444" strokeWidth="1.2" opacity="0.7">
                <animate attributeName="r" values="6;12;6" dur="1s" repeatCount="indefinite" />
              </circle>
              <polygon points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2" fill="#ef4444" />
              <circle cx="0" cy="0" r="2" fill="#ffffff" />
            </g>
            {/* Patrol Boat */}
            <g transform="translate(126, 80)">
              <path d="M-15 0 L12 -2 L16 0 L12 2 L-15 0 Z" className="fill-slate-600 dark:fill-slate-400" />
            </g>
          </svg>
        </div>
      )}

      {/* ── 8. WORDLE ───────────────────────────────────────────── */}
      {id === 'wordle' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-emerald-100/90 via-teal-50 to-green-200/80 dark:from-slate-950 dark:via-emerald-950/40 dark:to-slate-950">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Wordle">
            <g transform="translate(32, 16)">
              {/* Row 1 */}
              <rect x="0" y="0" width="22" height="22" rx="4" fill="#eab308" />
              <text x="11" y="13" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="11" textAnchor="middle" dominantBaseline="middle">G</text>
              <rect x="26" y="0" width="22" height="22" rx="4" fill="#22c55e" />
              <text x="37" y="13" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="11" textAnchor="middle" dominantBaseline="middle">A</text>
              <rect x="52" y="0" width="22" height="22" rx="4" className="fill-slate-400 dark:fill-slate-700" />
              <text x="63" y="13" fill="#f8fafc" fontFamily="monospace" fontWeight="900" fontSize="11" textAnchor="middle" dominantBaseline="middle">M</text>
              <rect x="78" y="0" width="22" height="22" rx="4" fill="#eab308" />
              <text x="89" y="13" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="11" textAnchor="middle" dominantBaseline="middle">E</text>
              <rect x="104" y="0" width="22" height="22" rx="4" fill="#22c55e" />
              <text x="115" y="13" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="11" textAnchor="middle" dominantBaseline="middle">S</text>

              {/* Row 2 */}
              <rect x="0" y="28" width="22" height="22" rx="4" fill="#eab308" />
              <text x="11" y="41" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="11" textAnchor="middle" dominantBaseline="middle">P</text>
              <rect x="26" y="28" width="22" height="22" rx="4" fill="#22c55e" />
              <text x="37" y="41" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="11" textAnchor="middle" dominantBaseline="middle">L</text>
              <rect x="52" y="28" width="22" height="22" rx="4" fill="#22c55e" />
              <text x="63" y="41" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="11" textAnchor="middle" dominantBaseline="middle">A</text>
              <rect x="78" y="28" width="22" height="22" rx="4" className="fill-slate-400 dark:fill-slate-700" />
              <text x="89" y="41" fill="#f8fafc" fontFamily="monospace" fontWeight="900" fontSize="11" textAnchor="middle" dominantBaseline="middle">N</text>
              <rect x="104" y="28" width="22" height="22" rx="4" className="fill-slate-400 dark:fill-slate-700" />
              <text x="115" y="41" fill="#f8fafc" fontFamily="monospace" fontWeight="900" fontSize="11" textAnchor="middle" dominantBaseline="middle">E</text>

              {/* Row 3: VICTORY PLAYS */}
              {['P', 'L', 'A', 'Y', 'S'].map((char, i) => (
                <g key={i} transform={`translate(${i * 26}, 56)`}>
                  <rect x="0" y="0" width="22" height="22" rx="4" fill="#22c55e" stroke="#86efac" strokeWidth="1">
                    <animate attributeName="opacity" values="0.85;1;0.85" dur="1.5s" repeatCount="indefinite" />
                  </rect>
                  <text x="11" y="13" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="12" textAnchor="middle" dominantBaseline="middle">{char}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      )}

      {/* ── 9. MINESWEEPER ──────────────────────────────────────── */}
      {id === 'minesweeper' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-slate-100 via-teal-50 to-emerald-100/70 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/40">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Minesweeper">
            <g transform="translate(24, 16)">
              <rect x="0" y="0" width="24" height="24" rx="4" className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />
              <text x="12" y="14" fill="#0284c7" fontFamily="monospace" fontWeight="900" fontSize="12" textAnchor="middle" dominantBaseline="middle">1</text>
              <rect x="28" y="0" width="24" height="24" rx="4" className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />
              <text x="40" y="14" fill="#16a34a" fontFamily="monospace" fontWeight="900" fontSize="12" textAnchor="middle" dominantBaseline="middle">2</text>
              <rect x="56" y="0" width="24" height="24" rx="4" className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />
              <text x="68" y="14" fill="#dc2626" fontFamily="monospace" fontWeight="900" fontSize="12" textAnchor="middle" dominantBaseline="middle">3</text>

              <rect x="0" y="28" width="24" height="24" rx="4" className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />
              <text x="12" y="42" fill="#0284c7" fontFamily="monospace" fontWeight="900" fontSize="12" textAnchor="middle" dominantBaseline="middle">1</text>
              {/* Flagged Mine */}
              <rect x="28" y="28" width="24" height="24" rx="4" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.2" />
              <line x1="36" y1="34" x2="36" y2="48" stroke="#475569" strokeWidth="1.5" />
              <polygon points="36,34 46,38 36,42" fill="#ef4444" />
              <rect x="56" y="28" width="24" height="24" rx="4" className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />
              <text x="68" y="42" fill="#16a34a" fontFamily="monospace" fontWeight="900" fontSize="12" textAnchor="middle" dominantBaseline="middle">2</text>

              <rect x="0" y="56" width="24" height="24" rx="4" className="fill-slate-200 dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-800" strokeWidth="1" />
              <rect x="28" y="56" width="24" height="24" rx="4" className="fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />
              <text x="40" y="70" fill="#0284c7" fontFamily="monospace" fontWeight="900" fontSize="12" textAnchor="middle" dominantBaseline="middle">1</text>
              <rect x="56" y="56" width="24" height="24" rx="4" className="fill-slate-200 dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-800" strokeWidth="1" />
            </g>
            {/* 3D Naval Mine */}
            <g transform="translate(142, 56)">
              <g className="stroke-slate-600 dark:stroke-slate-400" strokeWidth="4" strokeLinecap="round">
                <line x1="0" y1="-26" x2="0" y2="26" />
                <line x1="-26" y1="0" x2="26" y2="0" />
                <line x1="-18" y1="-18" x2="18" y2="18" />
                <line x1="-18" y1="18" x2="18" y2="-18" />
              </g>
              <circle cx="0" cy="0" r="22" className="fill-slate-700 dark:fill-slate-800 stroke-slate-500" strokeWidth="1.8" />
              <circle cx="0" cy="0" r="4" fill="#ef4444">
                <animate attributeName="fill" values="#ef4444;#fee2e2;#ef4444" dur="0.8s" repeatCount="indefinite" />
              </circle>
            </g>
          </svg>
        </div>
      )}

      {/* ── 10. SUDOKU ──────────────────────────────────────────── */}
      {id === 'sudoku' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-sky-100/90 via-blue-50 to-indigo-100/80 dark:from-slate-950 dark:via-sky-950/40 dark:to-slate-950">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Sudoku">
            <g transform="translate(50, 10)">
              <rect x="0" y="0" width="92" height="92" rx="6" className="fill-white/85 dark:fill-slate-900/90 stroke-sky-400 dark:stroke-sky-500" strokeWidth="2" />
              {/* Intersection Cross */}
              <rect x="0" y="31" width="92" height="15" fill="#38bdf8" fillOpacity="0.2" />
              <rect x="31" y="0" width="15" height="92" fill="#38bdf8" fillOpacity="0.2" />
              <rect x="31" y="31" width="15" height="15" fill="#0284c7" fillOpacity="0.35" stroke="#0284c7" strokeWidth="1" />
              {/* Block Borders */}
              <line x1="31" y1="0" x2="31" y2="92" stroke="#0284c7" strokeWidth="1.5" />
              <line x1="62" y1="0" x2="62" y2="92" stroke="#0284c7" strokeWidth="1.5" />
              <line x1="0" y1="31" x2="92" y2="31" stroke="#0284c7" strokeWidth="1.5" />
              <line x1="0" y1="62" x2="92" y2="62" stroke="#0284c7" strokeWidth="1.5" />
              {/* Numbers */}
              <g fontFamily="sans-serif" fontWeight="900" fontSize="8" textAnchor="middle" dominantBaseline="middle">
                <text x="15" y="16" className="fill-slate-800 dark:fill-slate-100">5</text>
                <text x="46" y="16" className="fill-slate-500 dark:fill-slate-400">3</text>
                <text x="77" y="16" className="fill-slate-800 dark:fill-slate-100">7</text>
                <text x="15" y="47" className="fill-slate-500 dark:fill-slate-400">6</text>
                <text x="39" y="39" className="fill-sky-950 dark:fill-white font-extrabold" fontSize="9">8</text>
                <text x="77" y="47" fill="#0284c7">1</text>
                <text x="15" y="77" className="fill-slate-800 dark:fill-slate-100">4</text>
                <text x="46" y="77" fill="#0284c7">9</text>
                <text x="77" y="77" className="fill-slate-500 dark:fill-slate-400">2</text>
              </g>
            </g>
          </svg>
        </div>
      )}

      {/* ── 11. AIM TRAINER ─────────────────────────────────────── */}
      {id === 'aimtrainer' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-rose-100/90 via-red-50 to-orange-100/80 dark:from-slate-950 dark:via-rose-950/40 dark:to-slate-950">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Aim Trainer">
            <g transform="translate(96, 56)">
              <circle cx="0" cy="0" r="42" stroke="#f43f5e" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.6">
                <animateTransform attributeName="transform" type="rotate" values="0;360" dur="8s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="0" r="28" stroke="#f43f5e" strokeWidth="1.5" opacity="0.8" />
              <circle cx="0" cy="0" r="10" fill="#e11d48" stroke="#fecdd3" strokeWidth="1.5">
                <animate attributeName="r" values="8;11;8" dur="0.9s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="0" r="2" fill="#ffffff" />
              {/* Lasers */}
              <line x1="-50" y1="0" x2="-14" y2="0" stroke="#f43f5e" strokeWidth="1.5" />
              <line x1="14" y1="0" x2="50" y2="0" stroke="#f43f5e" strokeWidth="1.5" />
              <line x1="0" y1="-50" x2="0" y2="-14" stroke="#f43f5e" strokeWidth="1.5" />
              <line x1="0" y1="14" x2="0" y2="50" stroke="#f43f5e" strokeWidth="1.5" />
            </g>
            {/* Accuracy Badge */}
            <rect x="18" y="82" width="54" height="16" rx="4" className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />
            <text x="45" y="93" className="fill-emerald-700 dark:fill-emerald-400" fontFamily="monospace" fontWeight="900" fontSize="8" textAnchor="middle">99.8% ACC</text>
            {/* +100 CRIT */}
            <rect x="120" y="16" width="54" height="16" rx="4" fill="#e11d48" stroke="#fecdd3" strokeWidth="1" />
            <text x="147" y="27" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="8" textAnchor="middle">+100 CRIT</text>
          </svg>
        </div>
      )}

      {/* ── 12. WORD CHAIN ──────────────────────────────────────── */}
      {id === 'wordchain' && (
        <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-teal-100/90 via-emerald-50 to-cyan-100/80 dark:from-slate-950 dark:via-teal-950/40 dark:to-slate-950">
          <svg viewBox="0 0 192 112" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Word Chain">
            {/* Connecting Laser Arc */}
            <path d="M40 56 C70 56 80 34 100 34 C120 34 130 78 160 78" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.65" />
            <path d="M40 56 C70 56 80 34 100 34 C120 34 130 78 160 78" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 4" fill="none" />

            {/* Word 1: W - O - R - D */}
            <g transform="translate(16, 42)">
              <rect x="0" y="0" width="58" height="26" rx="6" className="fill-white dark:fill-slate-900 stroke-teal-500" strokeWidth="1.5" />
              <text x="12" y="16" className="fill-slate-800 dark:fill-teal-100" fontFamily="monospace" fontWeight="900" fontSize="10">W</text>
              <text x="24" y="16" className="fill-slate-800 dark:fill-teal-100" fontFamily="monospace" fontWeight="900" fontSize="10">O</text>
              <text x="36" y="16" className="fill-slate-800 dark:fill-teal-100" fontFamily="monospace" fontWeight="900" fontSize="10">R</text>
              <circle cx="50" cy="13" r="6" fill="#f59e0b" />
              <text x="50" y="16.5" fill="#451a03" fontFamily="monospace" fontWeight="900" fontSize="10" textAnchor="middle">D</text>
            </g>

            {/* Word 2: D - U - E - L */}
            <g transform="translate(86, 20)">
              <rect x="0" y="0" width="58" height="26" rx="6" className="fill-white dark:fill-slate-900 stroke-amber-500" strokeWidth="1.5" />
              <circle cx="10" cy="13" r="6" fill="#f59e0b" />
              <text x="10" y="16.5" fill="#451a03" fontFamily="monospace" fontWeight="900" fontSize="10" textAnchor="middle">D</text>
              <text x="24" y="16" className="fill-slate-800 dark:fill-amber-100" fontFamily="monospace" fontWeight="900" fontSize="10">U</text>
              <text x="36" y="16" className="fill-slate-800 dark:fill-amber-100" fontFamily="monospace" fontWeight="900" fontSize="10">E</text>
              <circle cx="50" cy="13" r="6" fill="#0d9488" />
              <text x="50" y="16.5" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="10" textAnchor="middle">L</text>
            </g>

            {/* Word 3: L - I - N - K */}
            <g transform="translate(118, 64)">
              <rect x="0" y="0" width="58" height="26" rx="6" className="fill-white dark:fill-slate-900 stroke-teal-500" strokeWidth="1.5" />
              <circle cx="10" cy="13" r="6" fill="#0d9488" />
              <text x="10" y="16.5" fill="#ffffff" fontFamily="monospace" fontWeight="900" fontSize="10" textAnchor="middle">L</text>
              <text x="24" y="16" className="fill-slate-800 dark:fill-teal-100" fontFamily="monospace" fontWeight="900" fontSize="10">I</text>
              <text x="36" y="16" className="fill-slate-800 dark:fill-teal-100" fontFamily="monospace" fontWeight="900" fontSize="10">N</text>
              <text x="48" y="16" className="fill-slate-800 dark:fill-teal-100" fontFamily="monospace" fontWeight="900" fontSize="10">K</text>
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}

export default GameVisualGraphic;
