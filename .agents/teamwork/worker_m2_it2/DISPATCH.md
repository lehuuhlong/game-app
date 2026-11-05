# Task Assignment: Worker M2 (Iteration 2: Audio Combo Parameter Defensive Clamp)

## Role & Mission
You are Worker M2 (Iteration 2) for Milestone 2: Web Audio Synthesis Safety.
Your mission is to add defensive parameter validation to `playFillSound` in `src/games/nonogram/sounds.ts` to resolve Challenger 2's `REQUEST_CHANGES` verdict.

## Authoritative User Request
c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\ORIGINAL_REQUEST.md
Please read this file first!

## Scope & File Ownership
You EXCLUSIVELY own:
- `src/games/nonogram/sounds.ts`
Do NOT modify any other files.

## Defect Details & Required Fix
From Challenger 2's report (`c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\challenger_m2_2\handoff.md`):
In `src/games/nonogram/sounds.ts` line 68:
When `combo` is negative (e.g. `combo <= -9`) or `NaN`:
`baseFreq` becomes non-positive (`<= 0`) or `NaN`, which causes `osc.frequency.exponentialRampToValueAtTime` to throw an unhandled `RangeError` (violating W3C Web Audio API rules).

Fix required in `src/games/nonogram/sounds.ts` in `playFillSound`:
```typescript
const safeCombo = typeof combo === 'number' && Number.isFinite(combo) ? Math.max(1, combo) : 1;
const baseFreq = 480 * Math.min(2.0, 1 + (safeCombo - 1) * 0.1);
```

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification Requirements
1. Run `npx tsx src/games/nonogram/soundsStress.test.ts` (all 23 tests must pass with 0 failures).
2. Run `npx tsc --noEmit` (0 errors).
3. Document your changes and results in `handoff.md`.

## Working Directory
`c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m2_it2/`
Write your findings to `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m2_it2\handoff.md`.
Communicate back via send_message to orchestrator (ID 30aefb17-8457-4163-9ce4-7310aa6b0402).


## 2026-11-05T15:14:05Z
You are Worker M2 (Iteration 2) for Milestone 2: Web Audio Synthesis Safety in Neon Nonogram.
Working directory: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m2_it2/
Please read your task DISPATCH file at: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m2_it2\DISPATCH.md
and the authoritative user request at: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\ORIGINAL_REQUEST.md
and Challenger 2's report at: c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\challenger_m2_2\handoff.md

Scope & File Ownership:
You EXCLUSIVELY own:
- `src/games/nonogram/sounds.ts`
Do NOT modify any other files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task:
Add the defensive clamp to `combo` in `playFillSound`:
```typescript
const safeCombo = typeof combo === 'number' && Number.isFinite(combo) ? Math.max(1, combo) : 1;
const baseFreq = 480 * Math.min(2.0, 1 + (safeCombo - 1) * 0.1);
```
Verify with:
1. `npx tsx src/games/nonogram/soundsStress.test.ts` (all 23 tests must pass)
2. `npx tsc --noEmit` (0 errors)

Write your report to `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m2_it2\handoff.md`.
Message orchestrator (ID 30aefb17-8457-4163-9ce4-7310aa6b0402) when done.
