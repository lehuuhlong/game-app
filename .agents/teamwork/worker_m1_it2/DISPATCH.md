# Task Assignment: Worker M1 (Iteration 2: Coordinate Boundary Validation)

## Role & Mission
You are Worker M1 (Iteration 2) for Milestone 1: Core Logic & State Engine.
Your mission is to add defensive coordinate boundary validation to `src/games/nonogram/useNonogramEngine.ts` to resolve the `REQUEST_CHANGES` verdict from Challenger 2.

## Authoritative User Request
c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\ORIGINAL_REQUEST.md
Please read this file first!

## Scope & File Ownership
You EXCLUSIVELY own:
- `src/games/nonogram/useNonogramEngine.ts`
- `src/games/nonogram/types.ts`
Do NOT modify any other files.

## Defect Details & Required Fix
From Challenger 2's handoff (`c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\challenger_m1_2\handoff.md`):
When out-of-bounds coordinates (e.g. `r < 0`, `r >= currentPuzzle.height`, `c < 0`, `c >= currentPuzzle.width`) are passed to `handlePointerDown`, `handlePointerEnter`, or `applyTargetToCell`:
`gridRef.current[r]` evaluates to `undefined`, causing `TypeError: Cannot read properties of undefined (reading '0')`.

Add guard clauses to `src/games/nonogram/useNonogramEngine.ts`:
1. In `applyTargetToCell`:
   ```typescript
   if (r < 0 || r >= currentPuzzle.height || c < 0 || c >= currentPuzzle.width) return;
   ```
2. In `handlePointerDown`:
   ```typescript
   if (r < 0 || r >= currentPuzzle.height || c < 0 || c >= currentPuzzle.width) return;
   ```
3. In `handlePointerEnter`:
   ```typescript
   if (r < 0 || r >= currentPuzzle.height || c < 0 || c >= currentPuzzle.width) return;
   ```

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification Requirements
1. Run `npx tsx src/games/nonogram/nonogramEngine.test.ts` (all 91 assertions must pass).
2. Run `npx tsc --noEmit` (0 errors).
3. Document your changes and results in `handoff.md`.

## Working Directory
`c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m1_it2/`
Write your findings to `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m1_it2\handoff.md`.
Communicate back via send_message to orchestrator (ID 30aefb17-8457-4163-9ce4-7310aa6b0402).
