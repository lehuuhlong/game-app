# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Casual players, friends, and puzzle enthusiasts looking for quick, frictionless browser gaming on both mobile and desktop devices. Users engage either solo during short breaks or socially in private rooms to challenge friends.

## Product Purpose

Provide an accessible, responsive, and delightful web portal for classic single-player logic puzzles and real-time online multiplayer games. Success means zero-friction onboarding, engaging real-time gameplay with low latency, and a cohesive, enjoyable experience.

## Positioning

A zero-friction, modern web gaming hub that combines timeless solo logic games (Sudoku, Minesweeper, 2048, Wordle, Chess) with real-time multiplayer tactical games (Caro/Gomoku, Word Chain/Nối Chữ, Battleship) under one unified glassmorphism aesthetic without requiring password registration or heavy downloads.

## Operating Context

- Cross-platform web browsers (Desktop Chrome/Firefox/Safari/Edge and mobile touch browsers).
- Fast casual play sessions (1 to 10 minutes) with instant restarts and responsive touch controls.
- Real-time multiplayer rooms with room code sharing and live chat.

## Capabilities and Constraints

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion.
- **Backend / Real-time**: Standalone Node.js Express server running Socket.io for multiplayer rooms, turn timers, and live states.
- **Database**: MongoDB with Mongoose for persistent user stats, game records, and global leaderboards.
- **Authentication**: Frictionless, passwordless username-only identification with client-side persistence and backend synchronization.
- **Single-Player Games**: Sudoku (multi-difficulty, note-taking, error heart system), Minesweeper (beginner to expert, chording), 2048, Wordle (5-letter solver with color hints), T-Rex runner, Aim Trainer, Chess.
- **Multiplayer Games**: Caro / Gomoku (5-in-a-row, private rooms, turn timers), Word Chain / Nối Chữ (Vietnamese dictionary validation, 20-second timer), Battleship, Monopoly.

## Brand Commitments

- **Name**: Game Portal.
- **Visual Feel**: Glassmorphism, deep dark mode backgrounds with vibrant glowing accents, fluid Framer Motion micro-interactions, responsive grid layouts.
- **Tone**: Playful, modern, intuitive, and distraction-free.

## Evidence on Hand

- Fully functional codebase with Next.js frontend (`src/`) and standalone WebSocket server (`socket-server/`).
- Implemented games located in `src/games/` (2048, aimtrainer, battleship, caro, chess, minesweeper, monopoly, sudoku, trex, wordchain, wordle).
- MongoDB models in `src/models/` and shared types in `shared/`.

## Product Principles

1. **Zero-Friction Access**: Players should be in a game within seconds. No lengthy forms, passwords, or mandatory onboarding walls.
2. **Instant & Responsive**: UI state, board interactions, animations, and multiplayer socket sync must feel instantaneous and snappy.
3. **Cohesive Polish**: Every game, whether 2048, Sudoku, or Caro, feels part of one unified, premium visual system with consistent UI controls and feedback.
4. **Touch & Desktop Parity**: Flawless experience across both high-density desktop displays and touch-based mobile screens.
5. **Fair & Transparent Play**: Clear rules, visible turn timers, and honest leaderboard tracking.

## Accessibility & Inclusion

- Responsive layout adapting to various viewport sizes and touch targets.
- High contrast readable text against dark glassmorphic surfaces.
- Clear visual state indicators (turn active, timer warnings, win/loss feedback) paired with text labels.
