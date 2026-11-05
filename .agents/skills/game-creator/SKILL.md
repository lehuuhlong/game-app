---
name: game-creator
description: >-
  Use this skill whenever the user wants to create, scaffold, or add a new game to the Game Portal.
  Provides a comprehensive step-by-step workflow covering game engine logic, Web Audio API sound synthesis,
  HUD scoreboard, responsive mobile touch controls, strict 100% English language requirement, and all 7 system registration points.
---

# Game Creator Skill

This skill guides you through scaffolding, implementing, and registering a new game into the **Game Portal** ecosystem. Every sub-step must be completed — missing any integration point will leave the game broken or invisible in the portal.

---

## Mandatory Language Policy: 100% English (STRICT)

**All new and updated games must be built strictly in ENGLISH.**
Never use Vietnamese or any other language for in-game content, UI, or game registration.

### 1. In-Game UI & Player Copy
- **HUD Labels**: `Score`, `Best`, `High Score`, `Level`, `Time`, `Combo`, `Lives`, `Moves`, `Accuracy`, `Remaining`, etc.
- **Start Screen Overlay**: Title, punchy subtitle, gameplay tips, keybindings (`Tap anywhere or press Space to jump`), call-to-action button (`Play Now`, `Start Game`).
- **Pause Screen**: `Game Paused`, `Press P to Resume`, `Resume`, `Quit`.
- **Game Over & Victory Modals**: `Game Over`, `Victory!`, `You Win!`, `Final Score`, `New Record!`, buttons (`Try Again`, `Play Again`, `Back to Lobby`).
- **Help / Rules Dialog**: Objective, rules description, controls guide (`[WASD] / [Arrows] to Move`, `[Space] to Action`, `[R] to Restart`).
- **In-Game Toasts & Floating Feedback**: Floating combo text (`+100`, `Combo x3!`, `Perfect!`, `Level Complete!`, `Invalid Move`).

### 2. Portal Registration & Metadata
- **Game Title & Description** in `src/config/games.ts`: English title, concise two-sentence English description.
- **Tags** in `src/config/games.ts`: Standard English tags (`Arcade`, `Puzzle`, `Strategy`, `Single Player`, `Multiplayer`, etc.).
- **Route Metadata** in `src/app/games/<id>/page.tsx`: English `title`, `description`, `keywords`.
- **Daily Spotlight** in `src/components/landing/DailySpotlight.tsx`: English goal label (e.g. `Score 500+ points`, `Clear level 5`).

### 3. Code, Comments & Anti-Cheat
- **Code Comments**: All explanatory comments, architecture notes, and JSDoc blocks must be in English.
- **Anti-Cheat Rejection Reasons** in `src/lib/gameSecurity.ts`: All `reason` strings must be in English (e.g. `'Score exceeds maximum threshold'`, `'Duration too short for score'`).

---

## Workflow Overview

```
Step 1: Game Archetype & Architecture Decision
       ↓
Step 2: Scaffold `src/games/<id>/` (types, engine, sounds, UI, barrel)
       ↓
Step 3: Route Creation `src/app/games/<id>/page.tsx`
       ↓
Step 4: Vector Thumbnail `public/games/<id>/thumbnail.svg`
       ↓
Step 5: Portal System Registration (Config, Home, Discovery, Icons, Visuals, Spotlight)
       ↓
Step 6: Security & Score Recording Integration
       ↓
Step 7: Pre-Launch Verification & Testing
```

---

## Step 1: Game Archetype & Architecture Decision

### 1A. Archetype Decision Tree

Identify the correct archetype based on the game idea. Each has trade-offs:

| Archetype | Examples in Portal | Rendering | Physics | State Shape | Pros | Cons |
|---|---|---|---|---|---|---|
| **2D Canvas Arcade** | Flappy Bird, T-Rex Runner, Neon Snake, Egg Pop | `<canvas>` + `requestAnimationFrame` | Simple delta-time velocity, gravity, AABB/circle collision | Mutable refs for hot-path entities, `useState` for HUD | 60fps game loop, pixel-perfect rendering, fast sprites | Must manage canvas lifecycle manually; no DOM accessibility |
| **Grid / Logic Board** | 2048, Sudoku, Minesweeper, Wordle, Line 98, Nonogram | React DOM `<div>` grid or `<table>` | None — pure state transitions | Immutable `Cell[][]` or `number[][]` in `useState` | Accessible via DOM; supports undo stack; React DevTools | Not suited for real-time continuous animation |
| **Physics-Driven 2D** | Billiards | `<canvas>` + Matter.js `Engine.create()` | `matter-js` rigid body simulation | Matter.js world is the source of truth; React reads positions via `useRef` | Realistic physics (friction, restitution, collisions) | Heavy bundle (~40KB gzipped); complex cleanup |
| **Tile Matching / Puzzle** | Pikachu, Block Drop | React DOM or Canvas hybrid | Gravity for falling pieces (Block Drop); pathfinding (Pikachu) | `Tile[][]` with animation state per tile | Visual polish with CSS/Framer Motion transitions | Complex animation sequencing |
| **Multiplayer Duel** | Caro, Chess, Battleship, Word Chain, Monopoly | React DOM board | Server-authoritative validation | Server-synced state via Socket.io; local optimistic UI | Real-time competitive play | Requires socket-server integration; latency handling |

### 1B. Performance Budget Per Archetype

| Archetype | Target FPS | Max JS Bundle (gzipped) | Max Memory (heap) | Max Audio Nodes |
|---|---|---|---|---|
| 2D Canvas Arcade | 60fps locked | < 25KB | < 30MB | 4 concurrent |
| Grid / Logic Board | N/A (event-driven) | < 15KB | < 20MB | 3 concurrent |
| Physics-Driven 2D | 60fps locked | < 50KB (with Matter.js) | < 40MB | 5 concurrent |
| Tile Matching | 30-60fps | < 20KB | < 25MB | 4 concurrent |
| Multiplayer Duel | N/A (event-driven) | < 20KB + socket.io client | < 25MB | 3 concurrent |

### 1C. State Management Decision

Choose the right state tool for each data type:

- **`useRef`** — Hot-path mutable data read every frame: entity positions, velocities, animation timers, canvas context, `AudioContext`. Never triggers re-renders.
- **`useState`** — HUD display values updated on user-visible events: score, level, lives, game status (`IDLE`/`PLAYING`/`PAUSED`/`GAME_OVER`). Triggers re-renders.
- **Zustand** — Cross-component persistent state: user preferences (muted, volume, theme), leaderboard cache, auth session. Survives component unmounts.
- **Server state** — Multiplayer board state, turn order, timers. Canonical source is the socket-server; client holds an optimistic mirror.

---

## Step 2: Scaffolding `src/games/<gameId>/`

Create `src/games/<gameId>/` with these 5 core files:

### 2A. `types.ts` — Data Contracts

```typescript
// Status union — every game uses this exact set
export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

// Difficulty — include if the game supports difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  level: number;
  isMuted: boolean;
  // Game-specific: entities, board, combo counter, timer, etc.
}

// Define all entity interfaces: Player, Obstacle, Projectile, Tile, Cell, etc.
// Keep them serializable (no functions, no DOM refs) so they can be logged for anti-cheat.
```

### 2B. `sounds.ts` — Web Audio API Synthesizer

All sound must be synthesized — zero external MP3/WAV files. Follow these patterns:

```typescript
let audioCtx: AudioContext | null = null;

// Lazy init — MUST wait for user interaction (browser autoplay policy)
function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ADSR envelope for musical quality
function applyADSR(
  gain: GainNode, ctx: AudioContext, now: number,
  attack = 0.01, decay = 0.1, sustain = 0.3, release = 0.2, duration = 0.3
) {
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + attack);
  gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
  gain.gain.setValueAtTime(sustain, now + duration - release);
  gain.gain.linearRampToValueAtTime(0, now + duration);
}
```

**Mandatory sound effects** (minimum 6):
1. `playStartSound()` — ascending arpeggio (C5→E5→G5)
2. `playActionSound()` — short click/tap (square wave, 800Hz, 50ms)
3. `playScoreSound(combo?: number)` — rising pitch based on combo multiplier
4. `playHitSound()` — low thud (triangle wave, 150Hz, 100ms, with noise layer)
5. `playGameOverSound()` — descending minor chord (E4→C4→A3)
6. `playVictorySound()` — triumphant fanfare (major arpeggio with delay effect)

**Advanced patterns:**
- **Layered sounds**: Combine oscillator + noise buffer for impact effects
- **Dynamic mixing**: Lower background volume during score popups
- **Spatial positioning** (canvas games): Use `StereoPannerNode` to pan sounds L/R based on entity X position
- **Filter sweeps**: Use `BiquadFilterNode` with `frequency.exponentialRampToValueAtTime()` for whoosh effects

### 2C. `use<Game>Engine.ts` — Game Logic Hook

Core responsibilities:

```typescript
export function use<Game>Engine(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  // === Refs for hot-path data (NO useState for per-frame data) ===
  const gameStateRef = useRef<InternalState>(initialState);
  const animFrameRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  // === useState ONLY for HUD-visible data ===
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [isMuted, setIsMuted] = useState(false);

  // === Canvas setup with devicePixelRatio ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    // ... game loop setup
  }, []);

  // === Input handling ===
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === 'KeyP') pauseGame();
      if (e.code === 'KeyR') restartGame();
      if (e.code === 'KeyM') toggleMute();
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // === Game loop with delta time ===
  // Use requestAnimationFrame with timestamp delta for frame-rate independence
  // ALWAYS cancel in cleanup: return () => cancelAnimationFrame(animFrameRef.current);

  // === Exposed API ===
  return { score, status, isMuted, startGame, pauseGame, restartGame, toggleMute };
}
```

**Error handling & graceful degradation:**
- Wrap canvas operations in try/catch — fall back to a "Canvas not supported" message
- Handle `AudioContext` creation failure silently (game works without sound)
- Guard against `null` canvas ref during SSR (Next.js renders server-side first)

### 2D. `Game<Game>.tsx` — Main Component

Structure (top to bottom):

1. **Header Bar**: Game title, rules toggle (`?` icon), mute button (`🔊`/`🔇`), fullscreen toggle
2. **Scoreboard HUD**: Glassmorphic stat cards — Score, High Score, Level/Combo
   ```tsx
   <div className="flex gap-3">
     <div className="bg-surface/70 backdrop-blur-md border border-border/80 rounded-xl px-4 py-2">
       <span className="text-xs uppercase tracking-wider text-foreground-muted">Score</span>
       <span className="text-2xl font-extrabold tabular-nums font-mono text-accent">{score}</span>
     </div>
   </div>
   ```
3. **Game Container**: Responsive wrapper with neon glow border
   ```tsx
   <div className="relative rounded-2xl border border-border/80 shadow-[0_0_30px_rgba(59,130,246,0.15)] overflow-hidden">
     <canvas ref={canvasRef} className="w-full" style={{ aspectRatio: '16/9' }} />
   </div>
   ```
4. **Mobile Touch Controls**: Rendered only on touch devices
5. **Game Over / Victory Modal**: Glassmorphic overlay with stats, high score badge, restart button
6. **Session Hook Integration** (see Step 2E)

### 2E. `useGameSession` Integration — Full Lifecycle

Connect the game to the session and score submission system:

```typescript
import { useGameSession } from '@/hooks/useGameSession';

// Inside Game<Game>.tsx:
const { startSession, ensureSessionToken, getElapsedDuration, clearSession } = useGameSession('<gameId>');

// 1. START: When user clicks "Play" or game begins
const handleStart = async () => {
  await startSession(userId, username, true); // force=true for fresh session
  engine.startGame();
};

// 2. RESTART: Force a new session
const handleRestart = async () => {
  clearSession();
  await startSession(userId, username, true);
  engine.restartGame();
};

// 3. SCORE SUBMIT: When game ends (GAME_OVER or VICTORY)
const handleGameEnd = async (finalScore: number) => {
  const token = await ensureSessionToken(userId, username);
  if (!token || !userId) return;

  await fetch(`/api/users/${userId}/score`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameType: '<gameId>',
      score: finalScore,
      duration: getElapsedDuration(),
      sessionToken: token,
      // Game-specific extra data for anti-cheat:
      extraData: { level, moveCount, accuracy, highestTile },
    }),
  });
};

// 4. MATCH RECORD: Save match to history (optional, for leaderboard)
const handleRecordMatch = async (finalScore: number, result: 'win' | 'loss' | 'draw') => {
  const token = await ensureSessionToken(userId, username);
  await fetch('/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameType: '<gameId>',
      players: [{ userId, username, score: finalScore, result }],
      duration: getElapsedDuration(),
      sessionToken: token,
    }),
  });
};
```

### 2F. Mobile Touch Controls — Beyond Basic D-Pad

Choose the right touch pattern for the archetype:

| Input Pattern | Best For | Implementation |
|---|---|---|
| **D-Pad (4-way)** | Snake, grid movers | Four `<button>` arrows positioned bottom-left |
| **Single tap / hold** | Flappy Bird, runners | `onTouchStart` on canvas for jump/action |
| **Swipe gestures** | 2048, card games | Track `touchstart`→`touchend` delta; threshold 30px |
| **Drag & aim** | Billiards, Egg Pop | `touchmove` for angle calculation with visual guide line |
| **Pinch-to-zoom** | Map/board viewers | Two-finger touch distance delta for scale transform |
| **Long-press** | Minesweeper flag, chess piece info | `setTimeout` 500ms on `touchstart`, clear on `touchend` |
| **Two-thumb virtual joystick** | Platformers | Left stick for movement, right area for action |

**Essential mobile UX:**
- Minimum touch target: **44×44px** (WCAG requirement)
- Prevent `touchmove` default to stop page scroll during gameplay
- Use `touch-action: none` CSS on game container
- Detect touch via `'ontouchstart' in window` to conditionally render controls

### 2G. `index.ts` — Barrel Export

```typescript
export { Game<Game> } from './Game<Game>';
```

---

## Step 3: Route Creation

Create `src/app/games/<gameId>/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Game<Game> } from "@/games/<gameId>";

export const metadata: Metadata = {
  title: "<Game Title> — Game Portal",
  description: "<Punchy 1-2 sentence game description for SEO>",
  openGraph: {
    title: "<Game Title> — Game Portal",
    description: "<Same description>",
    images: ["/games/<gameId>/thumbnail.svg"],
  },
  keywords: ["<game-title>", "online game", "browser game", "arcade", "puzzle"],
};

export default function GamePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <Game<Game> />
    </main>
  );
}
```

**SEO best practices:**
- Include `openGraph` with thumbnail image for social sharing
- Add relevant `keywords` for discoverability
- Keep `description` under 160 characters
- Title format: `"<Game Title> — Game Portal"`

---

## Step 4: Vector Thumbnail

Create `public/games/<gameId>/thumbnail.svg`:
- Dimensions: `viewBox="0 0 384 224"`
- Use vibrant gradient background matching the game's `color` from the registry
- Include 2-3 thematic game elements (e.g., paddle + ball + bricks for Breakout)
- Use `2px` crisp outlines with neon glow via SVG `<filter>` elements
- No external image URLs — pure inline SVG only
- Test rendering at both 384×224 and 192×112 (retina and standard)

---

## Step 5: Portal System Registration

You **MUST** update ALL of these files. Missing any will leave the game partially visible or broken:

### 5A. `src/config/games.ts` — Game Registry

```typescript
{
  id: '<gameId>',
  title: '<Game Title>',
  description: '<Two sentence description>',
  thumbnail: '/games/<gameId>/thumbnail.svg',
  route: '/games/<gameId>',
  minPlayers: 1,  // 1 for single, 2+ for multiplayer
  maxPlayers: 1,  // Match actual player count
  tags: ['Arcade', 'Single Player', 'Reflex'],  // Use existing tag vocabulary
  color: 'from-amber-500 via-orange-600 to-red-700',  // Unique gradient, avoid duplicating existing games
}
```

**Existing tag vocabulary**: `Arcade`, `Single Player`, `Multiplayer`, `Puzzle`, `Strategy`, `Board Game`, `Reflex`, `Endless`, `Word`, `Logic`, `Classic`, `Retro`, `Action`, `War`, `Fast Paced`, `Number`, `Physics`, `Cyberpunk`.

### 5B. `src/app/page.tsx` — Home Page

Add `'<gameId>'` to `COMPLETED_GAME_IDS` array. Optionally add to `HOT_GAME_IDS` if the game should be featured.

### 5C. `src/app/games/page.tsx` — Discovery Page

Add estimated session duration:
```typescript
'<gameId>': '1-5m'  // Options: '1-3m', '1-5m', '5-15m', '10-30m', '15-45m', '30m+'
```

### 5D. `src/components/landing/GameCard3D.tsx` — Card Duration Map

Add matching duration: `'<gameId>': '1-5m'`

### 5E. `src/components/landing/GameIcons.tsx` — Icon Component

Create a 24×24 SVG icon and register it:
```tsx
const <GameTitle>Icon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    {/* Game-specific icon paths */}
  </svg>
);

// In getGameIcon() switch:
case '<gameId>': return <GameTitle>Icon;
```

### 5F. `src/components/landing/GameVisualGraphic.tsx` — Bento Visual

Add an animated SVG preview graphic for the landing page bento grid.

### 5G. `src/components/landing/DailySpotlight.tsx` — Spotlight Goal

Add target goal configuration:
```typescript
'<gameId>': { goal: 500, label: 'Score 500+ points' }
```

---

## Step 6: Security & Score Recording

### 6A. `src/lib/gameSecurity.ts` — Anti-Cheat Rules

Add a `case '<gameId>':` block in `validateGameScore()`:

```typescript
case '<gameId>': {
  // 1. Hard maximum cap
  if (score > <THEORETICAL_MAX>) {
    return { valid: false, reason: '<Game> score exceeds maximum threshold' };
  }
  // 2. Minimum duration check (score X requires at least Y seconds)
  if (score > <THRESHOLD> && durationSeconds < <MIN_SECONDS>) {
    return { valid: false, reason: 'Duration too short for <Game> score' };
  }
  // 3. Rate-of-score check (max points per second)
  if (durationSeconds > 0 && score / durationSeconds > <MAX_RATE>) {
    return { valid: false, reason: 'Rate of score exceeds realistic threshold' };
  }
  // 4. Idle session detection (score too low for elapsed time)
  if (score > <LOW_THRESHOLD>) {
    const maxDuration = (score / <MIN_RATE>) + <GRACE_SECONDS>;
    if (durationSeconds > maxDuration) {
      return { valid: false, reason: 'Idle session detected' };
    }
  }
  // 5. Game-specific integrity (extraData validation)
  if (typeof extraData.<field> === 'number') {
    // Validate consistency between score and gameplay evidence
  }
  return { valid: true };
}
```

### 6B. `src/models/Match.ts` — Type Registration

Add `'<gameId>'` to the `AllGameType` union and the `enum` array in `MatchSchema`.

### 6C. `src/app/api/users/[id]/score/route.ts`

Ensure the score PATCH handler processes `<gameId>` and updates user best scores.

---

## Step 7: Pre-Launch Verification & Testing

### 7A. Build Verification

```powershell
# TypeScript compilation — must pass with zero errors
npm run build

# Lint check
npm run lint
```

### 7B. Functional Testing Checklist

- [ ] Game starts from IDLE, transitions to PLAYING on user action
- [ ] Score increments correctly for each scoring event
- [ ] Game over triggers correctly (collision, timer, health depleted)
- [ ] Victory condition triggers correctly (if applicable)
- [ ] Pause/resume works (keyboard `P` and UI button)
- [ ] Restart works (keyboard `R` and UI button) with session renewal
- [ ] Mute/unmute toggles all sounds
- [ ] High score persists across restarts (localStorage or server)
- [ ] Mobile touch controls render on touch devices and work correctly
- [ ] Canvas resizes correctly on window resize and orientation change
- [ ] `useGameSession` starts session on play, submits score on game end
- [ ] Score submission includes valid `sessionToken` and `extraData`
- [ ] Anti-cheat rules in `gameSecurity.ts` pass for legitimate scores
- [ ] Anti-cheat rules reject obvious spoofed scores
- [ ] **100% English Language Compliance**: All HUD counters, modals (Start, Pause, Game Over, Victory), instructions, controls hints, metadata, spotlight labels, and security reason messages are strictly in English (zero Vietnamese or non-English text)
- [ ] Game appears on home page and discovery page
- [ ] Thumbnail renders correctly in game cards
- [ ] Icon renders correctly in game list
- [ ] Daily spotlight goal is achievable

### 7C. Common Pitfalls & Debugging Tips

| Pitfall | Symptom | Fix |
|---|---|---|
| Missing `cancelAnimationFrame` | Memory leak, multiple game loops stacking | Always `return () => cancelAnimationFrame(id)` in `useEffect` |
| `useState` in game loop | Stuttering, 120+ re-renders/second | Use `useRef` for per-frame data; `useState` only for HUD |
| AudioContext before interaction | Console warning, no sound | Lazy-init on first user click/tap |
| Canvas blurry on Retina | Fuzzy rendering on high-DPI screens | Apply `window.devicePixelRatio` scaling |
| SSR crash on `window` | Build error: `window is not defined` | Guard with `typeof window !== 'undefined'` or `useEffect` |
| Touch scroll during gameplay | Page bounces while playing on mobile | Add `touch-action: none` and `e.preventDefault()` on touchmove |
| Stale closure in game loop | Game reads old state values | Read from `ref.current` inside `requestAnimationFrame` callback |
| Session token expired | Score submission 401/403 | Use `ensureSessionToken()` which auto-renews at 75% TTL |
| Event listeners not cleaned up | Memory leak on route navigation | Return cleanup function from every `useEffect` that adds listeners |

### 7D. Accessibility Baseline

Every game must meet these minimums:
- Focus trap: game container receives focus, `Escape` releases it
- Keyboard shortcuts: display shortcut hints (`<kbd>` tags) below the game
- Screen reader: announce game status changes (`aria-live="polite"` region)
- Reduced motion: check `prefers-reduced-motion` and disable non-essential animations
- Color contrast: all text must meet WCAG 2.1 AA (4.5:1 ratio minimum)
