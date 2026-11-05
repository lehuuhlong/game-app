# Task Assignment: Worker M2 (Web Audio Synthesis Safety)

## Role & Mission
You are Worker M2 for Milestone 2: Web Audio Synthesis Safety in Neon Nonogram.
Your mission is to audit and fix all Web Audio safety, click prevention, node cleanup, and mute synchronization issues in `src/games/nonogram/sounds.ts`.

## Authoritative User Request
c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\ORIGINAL_REQUEST.md
Please read this file first!

## Scope & File Ownership
You EXCLUSIVELY own:
- `src/games/nonogram/sounds.ts`
Do NOT modify any other files.

## Project Scope & Explorer Findings
- `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\orchestrator\PROJECT.md`
- Complete findings and diff recommendations:
  `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\explorer_survey_3\handoff.md` (Section 1A, 2, 6 Fix 1)

## Features to Implement (F12 to F15)
1. **F12: Audio Mute Synchronization**:
   - In `sounds.ts`, currently `isMuted` is initialized to `false` in memory and checked via `if (isMuted) return;`, ignoring `localStorage`.
   - Implement an `isAudioMuted()` helper (or initialize `isMuted = getMuted()`), and ensure `setMuted(muted: boolean)` persists to `localStorage.setItem('nonogram-sound-muted', String(muted))` AND updates in-memory `isMuted`.
   - Every sound function must respect the user's mute setting consistently across page reloads.
2. **F13: Audio Graph Node Disconnect (Memory Leak Fix)**:
   - In all 7 sound functions (`playFillSound`, `playCrossSound`, `playMistakeSound`, `playLineCompleteSound`, `playHintSound`, `playUndoSound`, `playVictorySound`):
   - Hook `osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} };` on every oscillator created.
   - For multi-oscillator chords/polyphonic loops, ensure each oscillator and gain node is disconnected on ended.
3. **F14: Safe AudioContext Resume**:
   - In `getAudioContext()`: `if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume().catch(() => {}); }` to prevent unhandled promise rejections on power save or autoplay policies.
4. **F15: Audio Click / Transient Prevention**:
   - Replace abrupt `setValueAtTime(volume, now)` attacks with micro-attacks: start at `0.0001` at `now` and `linearRampToValueAtTime(targetVol, now + 0.005)`.
   - Before `osc.stop(stopTime)`, replace abrupt cutoff from `0.001` with a clean `linearRampToValueAtTime(0, stopTime)`.
   - For `playMistakeSound`, avoid abrupt frequency steps: ramp `osc.frequency.linearRampToValueAtTime(95, now + 0.08)`.
   - For chord loops (e.g. `playLineCompleteSound`, `playHintSound`, `playVictorySound`), initialize `gain.gain.setValueAtTime(0.0001, now)` and only ramp up at `start = now + idx * delay`.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification Requirements
1. Run `npx tsc --noEmit` and ensure 0 errors.
2. Verify node disconnects and mute state via a test harness or script.
3. Document all changes and verification in `handoff.md`.

## Working Directory
`c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m2/`
Write your findings to `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m2\handoff.md`.
Communicate back via send_message to orchestrator (ID 30aefb17-8457-4163-9ce4-7310aa6b0402).

## 2026-11-05T14:52:26Z
You are Worker M2 for Milestone 2: Web Audio Synthesis Safety in Neon Nonogram.
Working directory: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m2/
Please read your task DISPATCH file at: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m2\DISPATCH.md
and the authoritative user request at: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\ORIGINAL_REQUEST.md
and Explorer 3's findings at: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\explorer_survey_3\handoff.md

Scope & File Ownership:
You EXCLUSIVELY own:
- `src/games/nonogram/sounds.ts`
Do NOT modify any other files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement F12 to F15:
1. Audio mute synchronization with localStorage across reloads (`isAudioMuted()`).
2. Node disconnect cleanup on `osc.onended` across all 7 sound functions (GainNode and OscillatorNode disconnects).
3. Safe `audioCtx.resume()` with unhandled promise rejection catch.
4. Click & transient popping prevention: micro-attack linear ramps from 0.0001, zero-crossing ramps before stop, and chord loop initialization at 0.0001.

Verify with:
1. `npx tsc --noEmit` (0 errors)
2. Empirical testing script or verification of node disconnects and mute behavior.

Write your report to `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m2\handoff.md`.
Message orchestrator (ID 30aefb17-8457-4163-9ce4-7310aa6b0402) when done.

## 2026-11-05T14:57:45Z
**Context**: Milestone 2 - Web Audio Synthesis Safety
**Content**: Checking in on implementation progress for F12-F15 in `src/games/nonogram/sounds.ts`.
**Action**: Please update your progress.md and report status or deliver your handoff when tests pass.


