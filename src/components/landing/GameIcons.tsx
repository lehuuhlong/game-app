import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Premium authored SVG icons for all 11 games in the portal.
 * Adheres to consistent 2px stroke weight, clean geometric curves, and dark-mode neon accents.
 */
export function ChessIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 20l8 0" />
      <path d="M9 20l1 -3l4 0l1 3" />
      <path d="M10 17l-1 -5l1 -3l4 -2l3 3l-1 2l-1 5" />
      <path d="M12 9l2 0" />
      <circle cx="14" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

export function MonopolyIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
      <path d="M15 9v12" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="18" cy="6" r="1" fill="currentColor" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function CaroIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
      {/* X in top-left */}
      <path d="M5 5l2 2m0-2l-2 2" stroke="currentColor" strokeWidth="1.75" />
      {/* O in center */}
      <circle cx="12" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.75" />
      {/* X in bottom-right */}
      <path d="M17 17l2 2m0-2l-2 2" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function BattleshipIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 19l2.5-3h15L22 19H2z" />
      <path d="M6 16V9l6-3v10" />
      <path d="M12 11h4l2 5" />
      <circle cx="9" cy="8" r="1" fill="currentColor" />
      <line x1="12" y1="3" x2="12" y2="6" />
    </svg>
  );
}

export function Puzzle2048Icon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" />
      <path d="M7 6l0 2" strokeWidth="2.5" />
      <path d="M16 6h2v2h-2v2h2" strokeWidth="1.5" />
    </svg>
  );
}

export function WordleIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="4" width="5" height="5" rx="1" />
      <rect x="9.5" y="4" width="5" height="5" rx="1" />
      <rect x="16" y="4" width="5" height="5" rx="1" />
      <rect x="3" y="10.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="10.5" width="5" height="5" rx="1" fill="currentColor" fillOpacity="0.25" />
      <rect x="16" y="10.5" width="5" height="5" rx="1" />
      <rect x="3" y="17" width="5" height="5" rx="1" />
      <rect x="9.5" y="17" width="5" height="5" rx="1" />
      <rect x="16" y="17" width="5" height="5" rx="1" />
    </svg>
  );
}

export function AimTrainerIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  );
}

export function MinesweeperIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="6" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
      <circle cx="10" cy="10" r="1.25" fill="currentColor" />
    </svg>
  );
}

export function SudokuIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" strokeWidth="2.5" />
      <line x1="15" y1="3" x2="15" y2="21" strokeWidth="2.5" />
      <line x1="3" y1="9" x2="21" y2="9" strokeWidth="2.5" />
      <line x1="3" y1="15" x2="21" y2="15" strokeWidth="2.5" />
      <circle cx="6" cy="6" r="0.75" fill="currentColor" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" />
      <circle cx="18" cy="18" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function TRexIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 4h6v5h-4v2h4v2h-3v3h-2v4h-2v-4h-2v3H9v-3H7v-2h2v-2H5v-2h2V9h2V7h5V4z" />
      <rect x="17" y="5" width="1.5" height="1.5" fill="currentColor" />
      <path d="M3 21h18" strokeDasharray="3 3" />
    </svg>
  );
}

export function WordChainIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/**
 * Returns the matching SVG icon for any game ID
 */
export function getGameSvgIcon(id: string, className = '', size = 20) {
  switch (id) {
    case 'chess':
      return <ChessIcon className={className} size={size} />;
    case 'monopoly':
      return <MonopolyIcon className={className} size={size} />;
    case 'caro':
      return <CaroIcon className={className} size={size} />;
    case 'battleship':
      return <BattleshipIcon className={className} size={size} />;
    case '2048':
      return <Puzzle2048Icon className={className} size={size} />;
    case 'wordle':
      return <WordleIcon className={className} size={size} />;
    case 'aimtrainer':
      return <AimTrainerIcon className={className} size={size} />;
    case 'minesweeper':
      return <MinesweeperIcon className={className} size={size} />;
    case 'sudoku':
      return <SudokuIcon className={className} size={size} />;
    case 'trex':
      return <TRexIcon className={className} size={size} />;
    case 'wordchain':
      return <WordChainIcon className={className} size={size} />;
    default:
      return <Puzzle2048Icon className={className} size={size} />;
  }
}
