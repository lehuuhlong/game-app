## 2026-11-05T14:03:06Z
Have a full team of agents review the newly created game "Neon Nonogram" in `src/games/nonogram/` and fix all existing bugs across logic, UX, audio, and security.

Working directory: c:\Users\OS\Desktop\Study\game-app
Integrity mode: development

## Requirements

### R1. Logic & Clue Bug Audit and Fixing
Audit and fix core Nonogram logic in `src/games/nonogram/`, resolving any defects in clue generation, line completion auto-checking, victory condition evaluation, and cell state transitions.

### R2. Interaction & Mobile/Desktop UX
Audit and fix user interactions in `src/games/nonogram/GameNonogram.tsx`, ensuring drag-filling, drag-marking, pointer events, right-click actions, tool toggles, and undo stack operations function cleanly on both desktop and mobile viewports.

### R3. Web Audio Synthesis Safety
Audit and fix the Web Audio API synthesizer in `src/games/nonogram/sounds.ts`, ensuring AudioContext is initialized on user gesture, instances are reused, volume transitions ramp to prevent audio clicking, and nodes are properly disconnected.

### R4. Score Submission & Anti-Cheat Integration
Ensure score calculation, session handling via `useGameSession`, and anti-cheat threshold verification in `src/lib/gameSecurity.ts` and `src/app/api/users/[id]/score/route.ts` correctly track and validate game completions.

### R5. Code Quality & Build Verification
Fix all identified bugs and verify that TypeScript type checking (`npx tsc --noEmit`) and project build (`npm run build`) complete with zero errors.

## Acceptance Criteria

### Verification & Quality
- [ ] Core Nonogram gameplay functions without logic errors (clues accurately reflect rows/columns, completed lines auto-check or cross out correctly, puzzle completion triggers victory properly).
- [ ] Desktop and mobile controls (dragging, clicking, right-clicking, undo stack) work smoothly without state desynchronization.
- [ ] Sound effects play cleanly on user interactions without audio context warnings, volume clipping, or memory leaks.
- [ ] Game session completion records score through the anti-cheat verification pipeline without rejection.
- [ ] `npx tsc --noEmit` runs and finishes with zero errors.
- [ ] Project build completes cleanly without build failures.
