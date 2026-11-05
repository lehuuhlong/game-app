# Task Assignment: Worker M1 (Core Logic & State Engine)

## Role & Mission
You are Worker 1 for Milestone 1: Core Logic & State Engine.
Your mission is to implement all logic fixes in `src/games/nonogram/useNonogramEngine.ts` and `src/games/nonogram/types.ts`.

## Authoritative User Request
c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\ORIGINAL_REQUEST.md
Please read this file first!

## Scope & File Ownership
You EXCLUSIVELY own:
- `src/games/nonogram/useNonogramEngine.ts`
- `src/games/nonogram/types.ts`
Do NOT modify any other files.

## Project Scope & Specifications
- `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\orchestrator\PROJECT.md`
- Survey Findings & Exact Recommendations:
  - `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\explorer_survey_1\handoff.md`
  - `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\explorer_survey_2\handoff.md`

## Features to Implement (F1 to F5)
1. **F1: Bidirectional Line Completion**:
   - Refactor `checkLineCompletion`: check line satisfaction against solution.
   - If row `r` is valid, `newCompRows.add(r)`; if not valid, `newCompRows.delete(r)`.
   - If col `c` is valid, `newCompCols.add(c)`; if not valid, `newCompCols.delete(c)`.
   - Update `completedRows` and `completedCols` whenever changes occur.
   - Trigger `Sounds.playLineCompleteSound()` ONLY when a newly completed row/col transitions from incomplete to complete.
2. **F2: Zero-Clue Line Initialization**:
   - In `selectPuzzle`: pre-evaluate row and column completions against initial grid (empty) so all zero-clue lines (`[0]`) are immediately marked completed.
3. **F3: Drag Painting State Machine**:
   - Use `activeDragToolRef` and `dragTargetValueRef` to determine intent on `handlePointerDown`:
     - If cell clicked is 0 and tool is FILL -> target value is 1 (paint 1).
     - If cell clicked is 1 and tool is FILL -> target value is 0 (erase to 0).
     - If cell clicked is 0 and tool is CROSS -> target value is 2 (paint 2).
     - If cell clicked is 2 and tool is CROSS -> target value is 0 (erase to 0).
   - Use `visitedCellsRef = useRef<Set<string>>(new Set())` to ensure each cell is only updated once per continuous drag stroke.
   - Maintain `gridRef` for synchronous cell updates during fast dragging to avoid state loss from closed-over stale state.
   - If a mistake occurs in Classic mode, set `isPointerDownRef.current = false` immediately to stop the drag and prevent multi-heart death.
4. **F4: Classic Mode Solved-Cell Safety**:
   - In Classic mode: if a cell is already correctly solved (`currentVal === 1` and user touches it with CROSS, or `currentVal === 2` and user touches with FILL), do NOT penalize with a mistake or life deduction. Simply ignore or treat as resolved.
5. **F5: Reactive Undo & Redo Stack**:
   - Implement `undoStackRef` and `redoStackRef` of `MoveAction[][]`.
   - Add `undoCount` / `redoCount` state so `canUndo: boolean` and `canRedo: boolean` are reactively updated.
   - Expose `redo: () => void` and `canRedo: boolean` in the hook return interface and update `useNonogramEngine` return type in `types.ts` if needed.
   - In both `undo()` and `redo()`, recalculate line completions for affected rows and columns so completed clues are fully synchronized.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification Requirement
After implementing the changes, you MUST:
1. Run `npx tsc --noEmit` and ensure 0 errors.
2. Document your exact changes, build results, and verification steps in `handoff.md`.

## Working Directory
`c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m1/`
Write your report to `c:\Users\OS\Desktop\Study\game-app\.agents\teamwork\worker_m1\handoff.md`.
Communicate back to orchestrator via `send_message` when complete.


## 2026-11-05T14:15:28Z
Dispatch received from orchestrator (30aefb17-8457-4163-9ce4-7310aa6b0402):
Assigned Worker 1 for Milestone 1: Core Logic & State Engine in Neon Nonogram.


## 2026-11-05T14:25:52Z
Check-in from orchestrator (30aefb17-8457-4163-9ce4-7310aa6b0402):
Checking in on progress with F1-F5 implementation in `src/games/nonogram/useNonogramEngine.ts` and `src/games/nonogram/types.ts`.
