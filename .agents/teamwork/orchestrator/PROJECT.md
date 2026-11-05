# Project: Neon Nonogram Full Audit & Bug Remediation

## Architecture
- **Framework & Runtime**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4.
- **Game Engine**: `src/games/nonogram/useNonogramEngine.ts` (custom React hook managing puzzle state, timer, mistakes, undo/redo, line completion checks, score calculation).
- **Presentation & UX**: `src/games/nonogram/GameNonogram.tsx` (responsive canvas/board, HUD scoreboard, tool toggle, touch and pointer events, modals).
- **Audio Synthesizer**: `src/games/nonogram/sounds.ts` (pure Web Audio API synthesizer for all sounds).
- **Security & Anti-Cheat**: `src/lib/gameSecurity.ts` (score rate and ceiling validation) & `src/app/api/users/[id]/score/route.ts` (PATCH endpoint for score updates) & `useGameSession` (`src/hooks/useGameSession.ts`).
- **Portal Discovery**: `src/config/games.ts`, `src/app/page.tsx`, `src/app/games/page.tsx`, `src/components/landing/GameCard3D.tsx`, `GameIcons.tsx`, `GameVisualGraphic.tsx`, `DailySpotlight.tsx`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Bidirectional Line Completion | Add/delete completion sets on cell changes; sound on new completion | M1 | survey_1, survey_2 |
| F2 | Zero-Clue Line Initialization | Pre-evaluate lines with [0] clues on puzzle load | M1 | survey_1 |
| F3 | Drag Painting State Machine | Paint/erase target value uniformly; visited cells Set; stop on mistake | M1 | survey_1, survey_2 |
| F4 | Classic Mode Solved-Cell Safety | Guard already-solved cells against false penalty; prevent multi-heart death | M1 | survey_1 |
| F5 | Reactive Undo & Redo Stack | Implement redoStack, canUndo, canRedo, and line re-evaluation on undo/redo | M1 | survey_1, survey_2 |
| F6 | Right-Click Drag Persistence | Retain activeTool throughout drag gesture without reverting to primary tool | M3 | survey_1, survey_2 |
| F7 | Mobile Touch Drag Support | `touch-none`, elementFromPoint mapping, release pointer capture | M3 | survey_2 |
| F8 | Pointer Leak & Auxiliary Button Safety | Cancel drag on pointercancel/blur; ignore middle/extra buttons | M3 | survey_2 |
| F9 | Board Context Menu Suppression | Suppress context menu on entire board, clue headers, and corner box | M3 | survey_2 |
| F10 | Desktop Keyboard Shortcuts | Space to toggle tool (preventDefault), 'c' for cross, Ctrl+Y/Shift+Z redo | M3 | survey_2 |
| F11 | Responsive Mobile Scaling | Horizontal scroll wrapper (`overflow-x-auto`), compact cell sizing, mobile HUD | M3 | survey_2 |
| F12 | Audio Mute Synchronization | Query stored preference properly (`isAudioMuted`), sync with localStorage | M2 | survey_3 |
| F13 | Audio Graph Node Disconnect | Disconnect all GainNodes and OscillatorNodes on `osc.onended` | M2 | survey_3, survey_2 |
| F14 | Safe AudioContext Resume | Add `.catch()` to `audioCtx.resume()` to prevent unhandled rejections | M2 | survey_3 |
| F15 | Audio Click / Transient Prevention | Micro-attack ramps (0.005s) and zero-crossing ramps before stop | M2 | survey_3 |
| F16 | Score API PATCH Fix | Change fetch method from POST to PATCH in `GameNonogram.tsx` | M3 | survey_1, survey_2, survey_3 |
| F17 | Score Duration & Profile Refresh | Send duration in payload; call `refreshUser({ bestScoreNonogram })` | M3 | survey_3 |
| F18 | Fresh Session Lifecycle | Request fresh session token (`startSession(..., true)`) on restart/next | M3 | survey_1, survey_3 |
| F19 | Anti-Cheat Score Threshold | Raise nonogram max score ceiling from 1500 to 2000 in `gameSecurity.ts` | M3 | survey_1, survey_3 |
| F20 | Long Game Classification | Add nonogram to `isPuzzleOrLongGame` in score route | M3 | survey_3 |
| F21 | 7-Point Duration Map Registration | Add `'nonogram': '3–10m'` to `GAME_DURATIONS` in games page and GameCard3D | M3 | survey_1, survey_3 |
| F22 | TypeScript & Build Verification | Verify `npx tsc --noEmit` and `npm run build` with 0 errors | M4 | survey_3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Logic & State Engine | F1, F2, F3, F4, F5 | none | DONE |
| M2 | Web Audio Synthesis Safety | F12, F13, F14, F15 | none | IN_PROGRESS |
| M3 | Interaction, Mobile UX & Score Integration | F6, F7, F8, F9, F10, F11, F16, F17, F18, F19, F20, F21 | M1 | PLANNED |
| M4 | Full Quality & Build Verification | F22 | M1, M2, M3 | PLANNED |

## Interface Contracts
### `useNonogramEngine.ts` ↔ `GameNonogram.tsx`
- `toolMode`: `'FILL' | 'CROSS'`
- `handlePointerDown(r: number, c: number, isSecondaryClick?: boolean)`: Begins drag with determined intent (paint 1, paint 2, or erase 0).
- `handlePointerEnter(r: number, c: number)`: Continues drag applying initial intent, avoiding re-triggering visited cells.
- `handlePointerUp()`: Commits current drag batch to `undoStack`, clears `redoStack`, updates reactive `canUndo` and `canRedo`.
- `undo()`: Reverts last batch, pushes to `redoStack`, re-evaluates line completions.
- `redo()`: Reapplies move from `redoStack`, pushes to `undoStack`, re-evaluates line completions.
- `canUndo`: `boolean` (reactive state).
- `canRedo`: `boolean` (reactive state).
- `completedRows`: `Set<number>` (bidirectional).
- `completedCols`: `Set<number>` (bidirectional).

### `GameNonogram.tsx` ↔ `/api/users/[id]/score`
- Method: `PATCH`
- Headers: `{ 'Content-Type': 'application/json' }`
- Body: `{ game: 'nonogram', score: number, sessionToken: string, duration?: number }`
- Response: `{ message: string, bestScoreNonogram?: number, userScore?: number }`

### `sounds.ts` ↔ Game Engine
- All sound methods disconnect nodes after playback.
- Volume ramps smoothly to 0 before stopping.
- Respects `localStorage` mute state immediately.

## Code Layout
- `src/games/nonogram/types.ts`: Type interfaces for Nonogram game (Owned by M1).
- `src/games/nonogram/useNonogramEngine.ts`: Core game logic hook (Owned by M1).
- `src/games/nonogram/sounds.ts`: Pure Web Audio API sound synthesizer (Owned by M2).
- `src/games/nonogram/GameNonogram.tsx`: React UI component (Owned by M3).
- `src/lib/gameSecurity.ts`: Anti-cheat threshold rules (Owned by M3).
- `src/app/api/users/[id]/score/route.ts`: User score update endpoint (Owned by M3).
- `src/app/games/page.tsx`: Games directory page duration map (Owned by M3).
- `src/components/landing/GameCard3D.tsx`: 3D Game card duration map (Owned by M3).
