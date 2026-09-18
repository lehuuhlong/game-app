'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Point } from './types';

interface ElectricPathOverlayProps {
  path: Point[] | null;
  rows: number;
  cols: number;
  boardRef: React.RefObject<HTMLDivElement | null>;
}

export const ElectricPathOverlay: React.FC<ElectricPathOverlayProps> = ({
  path,
  rows,
  cols,
  boardRef,
}) => {
  if (!path || path.length < 2 || !boardRef.current) return null;

  const boardRect = boardRef.current.getBoundingClientRect();
  const width = boardRect.width;
  const height = boardRect.height;

  // Calculate cell dimensions including gaps
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  // Helper to map (r, c) to pixel center
  const getCenter = (p: Point) => {
    let x = (p.c + 0.5) * cellWidth;
    let y = (p.r + 0.5) * cellHeight;

    // Boundary clamp / padding for exterior paths
    if (p.c < 0) x = -cellWidth * 0.4;
    if (p.c >= cols) x = width + cellWidth * 0.4;
    if (p.r < 0) y = -cellHeight * 0.4;
    if (p.r >= rows) y = height + cellHeight * 0.4;

    return { x, y };
  };

  const points = path.map(getCenter);
  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-30 overflow-visible"
      style={{ width, height }}
    >
      <defs>
        {/* Neon Glow Filter */}
        <filter id="electric-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="lightning-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Wide Ambient Glow Beam */}
      <path
        d={pathD}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
        filter="url(#electric-glow)"
      />

      {/* Main Electric Beam */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="url(#lightning-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: [1, 0.8, 1, 0] }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />

      {/* Inner White-Hot Core */}
      <path
        d={pathD}
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* Turning Node Sparkles */}
      {points.map((pt, i) => (
        <motion.circle
          key={`spark_${i}`}
          cx={pt.x}
          cy={pt.y}
          r="6"
          fill="#fef08a"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.4, 0] }}
          transition={{ duration: 0.35 }}
        />
      ))}
    </svg>
  );
};
