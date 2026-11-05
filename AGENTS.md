# Game Portal — Agent Development Guidelines & Repository Rules

Welcome to the **Game Portal** codebase. This file serves as the primary rulebook and architectural blueprint for AI agents working within this repository. Follow these principles strictly when adding new games, refining UI/UX, or maintaining existing features.

---

## 1. Tech Stack & Architecture Overview

- **Framework**: [Next.js 16](file:///c:/Users/OS/Desktop/Study/game-app/next.config.ts) (App Router), [React 19](file:///c:/Users/OS/Desktop/Study/game-app/package.json), TypeScript 5.
- **Styling**: [Tailwind CSS v4](file:///c:/Users/OS/Desktop/Study/game-app/src/app/globals.css) with `@theme inline` design tokens, pure CSS custom variables.
- **Animation**: [Framer Motion](file:///c:/Users/OS/Desktop/Study/game-app/package.json) (springs, layout animations, presence exit/entry).
- **Game Physics & 3D**: Matter.js (2D rigid body physics), Three.js (3D rendering), Chess.js (chess rules engine).
- **Audio Engine**: Pure Web Audio API synthesized audio (Zero external MP3/WAV dependencies).
- **Multiplayer / Backend**: Standalone Express + Socket.io server in [socket-server/](file:///c:/Users/OS/Desktop/Study/game-app/socket-server).
- **Database**: MongoDB with Mongoose ([src/models/](file:///c:/Users/OS/Desktop/Study/game-app/src/models)).
- **State Management**: React custom hooks + Zustand for persistent client state.

---

## 2. Design System: "The Neon Arcade Sanctuary"

All games and UI components must adhere to the design language defined in [DESIGN.md](file:///c:/Users/OS/Desktop/Study/game-app/DESIGN.md):

- **Palette**:
  - Dark Canvas: `#050a18` (`bg-background`), `#0c1425` (`bg-background-secondary`).
  - Surfaces: `#111827` (`bg-surface`), `#1e293b` (`bg-surface-hover`).
  - Borders: `#1e293b` (`border-border`), `#334155` (`border-border-hover`).
  - Accents: Electric Azure `#3b82f6` (`text-accent`, `bg-accent`), Luminous Sky `#38bdf8`, Solar Amber `#f59e0b`.
  - Text: High contrast `#f1f5f9` (`text-foreground`), `#94a3b8` (`text-foreground-secondary`), `#64748b` (`text-foreground-muted`).
- **Glassmorphism**:
  - Use `backdrop-blur-md bg-surface/80 border border-border/80 shadow-md` for floating cards, HUD headers, and modals.
- **Interactive Polish ("Juice")**:
  - Smooth hover lifts (`hover:-translate-y-1 transition-all duration-200`).
  - Tactile button active states (`active:scale-95`).
  - Score combo pop animations (`animate-bounce` or Framer Motion springs).
  - Floating score pops (`+100` drifting upward and fading out).

---

## 3. Language & Localization Policy: English Only (STRICT)

Whenever creating, scaffolding, or updating any game in the portal:
- **100% English Game UI & Content**: ALL in-game UI copy, HUD labels (`Score`, `Best`, `Level`, `Time`, `Combo`, `Lives`), start screen guides, pause overlays, game over/victory dialogs, rules modals, difficulty options, button labels (`Play Now`, `Try Again`, `Resume`), and interactive tooltips **MUST BE IN ENGLISH**.
- **100% English Metadata**: Game titles, descriptions in [src/config/games.ts](file:///c:/Users/OS/Desktop/Study/game-app/src/config/games.ts), route SEO metadata in `src/app/games/<game-id>/page.tsx`, tags, and daily spotlight goals in [src/components/landing/DailySpotlight.tsx](file:///c:/Users/OS/Desktop/Study/game-app/src/components/landing/DailySpotlight.tsx) must be strictly in English.
- **100% English Code & Security Logs**: Variable names, code comments, console warnings, and anti-cheat rejection reasons in [src/lib/gameSecurity.ts](file:///c:/Users/OS/Desktop/Study/game-app/src/lib/gameSecurity.ts) must be written in English.
- **Zero Non-English In-Game Text**: Never use Vietnamese or other non-English languages for in-game content, game UI text, or game metadata.

---

## 4. Mandatory 7-Point Checklist for Adding Any New Game

When adding a new game with identifier `<game-id>` (e.g. `brickbreaker`), you **MUST** complete all 7 steps (ensuring all user-facing copy and metadata are strictly in English):

1. **Game Implementation Folder** in `src/games/<game-id>/`:
   - `types.ts`: Game state, entities, difficulty, and action interfaces.
   - `use<Game>Engine.ts` (or `use<Game>Logic.ts`): Custom React hook containing game loop, tick, input listeners, score state, and cleanup.
   - `sounds.ts`: Pure Web Audio API synthesizer for all in-game sound effects (jump, hit, score, win, lose).
   - `Game<Game>.tsx`: Main component with responsive canvas/board, HUD scoreboard, keyboard & mobile controls, pause/game over modal (all labels in English), and `useGameSession`.
   - `index.ts`: Re-export `Game<Game>`.

2. **Next.js App Route**:
   - `src/app/games/<game-id>/page.tsx`: Route page with English metadata (title, description, keywords), layout container, and game component.

3. **Vector Thumbnail**:
   - `public/games/<game-id>/thumbnail.svg`: 384x224 SVG image matching the game's theme.

4. **Game Registry**:
   - In [src/config/games.ts](file:///c:/Users/OS/Desktop/Study/game-app/src/config/games.ts), add entry to `GAMES` with English `title`, `description`, and `tags`.

5. **Home & Discovery Pages**:
   - [src/app/page.tsx](file:///c:/Users/OS/Desktop/Study/game-app/src/app/page.tsx): Add `<game-id>` to `COMPLETED_GAME_IDS` (and `HOT_GAME_IDS` if featured).
   - [src/app/games/page.tsx](file:///c:/Users/OS/Desktop/Study/game-app/src/app/games/page.tsx): Add estimated session duration.
   - [src/components/landing/GameCard3D.tsx](file:///c:/Users/OS/Desktop/Study/game-app/src/components/landing/GameCard3D.tsx): Add estimated duration map.
   - [src/components/landing/GameIcons.tsx](file:///c:/Users/OS/Desktop/Study/game-app/src/components/landing/GameIcons.tsx): Add 24x24 SVG icon component and case in `getGameIcon()`.
   - [src/components/landing/GameVisualGraphic.tsx](file:///c:/Users/OS/Desktop/Study/game-app/src/components/landing/GameVisualGraphic.tsx): Add animated SVG graphic for the Bento card.
   - [src/components/landing/DailySpotlight.tsx](file:///c:/Users/OS/Desktop/Study/game-app/src/components/landing/DailySpotlight.tsx): Add daily spotlight target goal with English `label`.

6. **Leaderboard & Security Verification**:
   - [src/lib/gameSecurity.ts](file:///c:/Users/OS/Desktop/Study/game-app/src/lib/gameSecurity.ts): Add anti-cheat threshold rule for `<game-id>` with English rejection reasons.
   - [src/app/api/users/[id]/score/route.ts](file:///c:/Users/OS/Desktop/Study/game-app/src/app/api/users/[id]/score/route.ts): Handle score update & best score calculation.

7. **Multiplayer (If applicable)**:
   - [socket-server/src/types.ts](file:///c:/Users/OS/Desktop/Study/game-app/socket-server/src/types.ts) & [socket-server/src/handlers.ts](file:///c:/Users/OS/Desktop/Study/game-app/socket-server/src/handlers.ts): Register room events and server-side state.

---

## 5. Performance & Memory Safety Guidelines

1. **Canvas Lifecycle**:
   - Always cancel `requestAnimationFrame(animId)` in the `useEffect` cleanup return.
   - Remove all window keydown/touch event listeners when unmounting.
2. **Web Audio Safety**:
   - Never initialize `AudioContext` until user interaction occurs (browser autoplay policy).
   - Reuse a single lazily-created `AudioContext` instance.
   - Always call `gainNode.disconnect()` or ramp volume to 0 to prevent audio clicking.
3. **Responsive Scaling**:
   - Ensure games dynamically scale to mobile viewport widths (`< 480px`).
   - Provide virtual on-screen touch controls (D-Pad or touch tap) for mobile touchscreens.

---

## 6. Skills & Specialized Agents Available

The workspace includes custom skills and agents in `.agents/`:
- **Skills**:
  - `game-creator`: Complete guide & templates to scaffold and register new games.
  - `game-ui-enhancer`: Recipes for elevating visual appeal, animations, sound design, and responsiveness.
  - `game-multiplayer-engine`: Protocols for real-time multiplayer with Socket.io.
- **Agents**:
  - `game-architect`: Specialist in mechanics, loop timing, math, and code generation.
  - `ui-polisher`: Specialist in UI aesthetics, neon glassmorphism, Framer Motion, and juice.
  - `game-debugger-auditor`: Specialist in TypeScript auditing, memory leaks, and anti-cheat validation.
