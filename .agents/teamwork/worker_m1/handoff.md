# Milestone 1 Handoff Report: Core Logic & State Engine (Worker M1)

**Worker**: Worker M1 (Core Logic & State Engine)  
**Milestone**: M1 (Core Logic & State Engine)  
**Date**: 2026-11-05T14:27:00Z  
**Target Files Owned**:
- `src/games/nonogram/useNonogramEngine.ts`
- `src/games/nonogram/types.ts`

---

## 1. Observation

### 1.1 Line Completion Unidirectional Bug in `useNonogramEngine.ts`
- **Prior Code**: Lines 80–114 only called `newCompRows.add(rIndex)` and `newCompCols.add(cIndex)`. Lines that ceased to be valid upon cell deletion, alteration, or undo were never removed (`delete` was never invoked). State setters `setCompletedRows` and `setCompletedCols` were gated on `if (lineCompletedSound)`, preventing state synchronization when lines became incomplete.
- **Implemented Fix**: Introduced `evaluateLines` which checks line satisfaction using `isRowSatisfied` and `isColSatisfied`. When a line satisfies the solution, it is added to the completed set; when it fails, it is deleted:
  ```typescript
  if (satisfied) {
    if (!nextRows.has(r)) {
      nextRows.add(r);
      newlyCompleted = true;
    }
  } else {
    nextRows.delete(r);
  }
  ```
  Sound `Sounds.playLineCompleteSound()` is triggered strictly when a line transitions from incomplete to complete (`newlyCompleted === true`).

### 1.2 Zero-Clue Line Omission on Puzzle Load
- **Prior Code**: In `selectPuzzle` (and initial state declaration), `completedRows` and `completedCols` were initialized to `new Set()`. Any puzzle with solution rows/columns consisting entirely of zeros (e.g., `hard_invader` row 0, 13, 14, col 0, 1, 13, 14 with clues `[0]`) started with un-struck clues.
- **Implemented Fix**: Introduced `getInitialCompletedLines(puzzle, initialGrid)` which evaluates the empty grid against the puzzle solution. All zero-clue lines are pre-evaluated and populated into `completedRows` and `completedCols` on mount and in `selectPuzzle` without triggering audio.

### 1.3 Rapid Drag Race Conditions & Inversion Toggling
- **Prior Code**:
  - `applyCellChange` closed over static `grid` state, causing rapid drag strokes to overwrite preceding cells with stale renders.
  - `dragTargetValueRef` was initialized but never read, causing drag events to flip cells back and forth on enter.
  - Right-click drag (`isSecondaryClick`) set `activeTool` on pointerdown but hardcoded primary `toolMode` on pointerenter.
- **Implemented Fix**:
  - Added synchronous `gridRef` updated on every cell modification to eliminate closure lag.
  - Added `visitedCellsRef: Set<string>` to guarantee each cell is updated at most once per drag stroke.
  - Added `activeDragToolRef` and `dragTargetValueRef`: uniform target is calculated on pointerdown (0+FILL->1, 1+FILL->0 erase, 0+CROSS->2, 2+CROSS->0 erase) and applied uniformly across `handlePointerEnter`.
  - On mistake in Classic mode, `isPointerDownRef.current = false` immediately halts the drag stroke, preventing multi-heart instant loss.

### 1.4 Classic Mode Solved-Cell False Penalties
- **Prior Code**: Interacting with an already-filled cell (`currentVal === 1`) with the CROSS tool in Classic mode evaluated `shouldBeFilled === true` as a mistake, deducting a heart. Symmetrically, touching an already-marked X (`currentVal === 2`) with the FILL tool evaluated `!shouldBeFilled === true` as a mistake.
- **Implemented Fix**: Added safety guard in `handlePointerDown` and `applyTargetToCell`:
  ```typescript
  if (gameMode === 'CLASSIC') {
    if (currentVal === 1 && tool === 'CROSS') return;
    if (currentVal === 2 && tool === 'FILL') return;
  }
  ```
  Touching already-resolved cells is safely ignored without penalties or life deductions.

### 1.5 Missing Redo Stack & Non-Reactive `canUndo`
- **Prior Code**: Only `undoStackRef` was present without a redo stack. `canUndo` read directly from `undoStackRef.current.length > 0` during render without state triggers, causing the Undo button to remain disabled after moves until unrelated re-renders occurred.
- **Implemented Fix**:
  - Added `undoStackRef` and `redoStackRef`.
  - Added reactive state counters `undoCount` and `redoCount` to ensure `canUndo` and `canRedo` update reactively on move commits, undo, redo, and puzzle changes:
    ```typescript
    const canUndo = undoCount > 0 && status !== 'WON' && status !== 'LOST';
    const canRedo = redoCount > 0 && status !== 'WON' && status !== 'LOST';
    ```
  - Added `redo()` callback to reapply undone move batches and check for victory.
  - Both `undo()` and `redo()` recalculate line satisfaction for all affected rows and columns via `evaluateLines`, keeping strike-through clues fully synchronized.
  - Defined and exported `UseNonogramEngineReturn` in `src/games/nonogram/types.ts` exposing `canRedo` and `redo()`.

---

## 2. Logic Chain

1. **Bidirectional Line Checking (F1)**:
   - Observation: When a line's satisfaction changes from true to false, clues must un-strike.
   - Deduction: Maintaining both addition and deletion logic in `evaluateLines` ensures `completedRows` and `completedCols` represent the exact mathematical satisfaction of clues at all times. Guarding `Sounds.playLineCompleteSound()` behind `newlyCompleted` prevents sound spam on cell edits within already-completed lines.

2. **Zero-Clue Line Initialization (F2)**:
   - Observation: For any puzzle line with clue `[0]`, the solution requires 0 filled cells. An empty grid contains 0 filled cells, which satisfies the clue.
   - Deduction: Pre-evaluating lines upon initial mount and in `selectPuzzle` guarantees that zero-clue lines are struck through upon puzzle presentation, preventing player confusion.

3. **Drag State Machine & Synchronous gridRef (F3)**:
   - Observation: React state updates are asynchronous; high-frequency pointerenter events can fire faster than render lifecycles. Uncontrolled toggles invert cells rather than drawing lines.
   - Deduction: Storing the current grid state in `gridRef` guarantees synchronous read-modify-write semantics across rapid drag strokes. Setting uniform `dragTargetValueRef` and tracking `visitedCellsRef` ensures drag gestures behave like traditional digital paint strokes. Halting drags on Classic mistakes protects players from multi-heart loss.

4. **Solved-Cell Safety (F4)**:
   - Observation: In Classic mode, a cell with value 1 is already proven correct, and a cell with value 2 is already marked empty.
   - Deduction: A player who inadvertently swipes across an already-correct cell should not be penalized as if they made a reasoning error. Ignoring opposite-tool touches on solved cells aligns with standard Nonogram UX.

5. **Reactive Undo & Redo (F5)**:
   - Observation: Players need both undo and redo capability, and the UI buttons must reflect availability immediately upon pointer release. Reverting cells can break completed lines.
   - Deduction: Tracking `undoCount` and `redoCount` triggers immediate React re-renders so `canUndo` and `canRedo` reflect current stack depths. Evaluating affected rows/columns during undo/redo guarantees visual clue integrity.

---

## 3. Caveats

- **Scope Boundary**: As specified in the dispatch rules, Worker M1 exclusively owns `src/games/nonogram/useNonogramEngine.ts` and `src/games/nonogram/types.ts`. Presentational UI wiring in `GameNonogram.tsx` (such as binding Redo buttons, `Ctrl+Y` keyboard shortcuts, and `touch-none` / `releasePointerCapture` touch handling) belongs to Milestone 3 (Worker M3). The engine now provides the complete interface (`redo`, `canRedo`, `handlePointerDown`, `handlePointerEnter`, `handlePointerUp`) for M3 to consume.
- **Audio Synthesizer Graph**: Sound trigger calls (`playLineCompleteSound`, `playFillSound`, `playCrossSound`, `playMistakeSound`, `playUndoSound`, `playVictorySound`) are properly called from the engine. Audio node disconnects and clicking transient safety belong to Milestone 2 (Worker M2) in `src/games/nonogram/sounds.ts`.

---

## 4. Conclusion

All 5 core logic and state engine features (F1 to F5) have been completely and genuinely implemented in `src/games/nonogram/useNonogramEngine.ts` and `src/games/nonogram/types.ts`.
- Zero TypeScript errors (`npx tsc --noEmit` exits with 0).
- Zero regression or modification to files outside M1 ownership.
- Backward compatibility preserved with `GameNonogram.tsx`.
- Programmatic verification tests verified line completion bidirectionality, zero-clue initialization, drag intent consistency, solved-cell safety, and undo/redo line synchronization with 100% pass rate.

---

## 5. Verification Method

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: Command exits with code 0 and no errors.

2. **Programmatic Logic Verification**:
   The logic was verified against the actual puzzle solutions in `src/games/nonogram/puzzles.ts`:
   - All zero-clue lines (`[0]`) in `hard_invader`, `hard_skull`, `hard_crown`, `med_gamepad`, `med_diamond` are pre-evaluated as completed on initial empty grid.
   - Filling row 1 in `easy_heart` marks row 1 completed; unfilling cell (1, 2) removes completion; re-filling cell (1, 2) re-completes it.
   - In Classic mode, clicking a filled cell (1) with CROSS or crossed cell (2) with FILL returns immediately without mistake penalty.
   - Drag intent state machine returns uniform targets: 0+FILL -> 1, 1+FILL -> 0, 0+CROSS -> 2, 2+CROSS -> 0.
   - Undo batch reverts grid and clears row completion; Redo batch reapplies grid and restores row completion; `canUndo` and `canRedo` update reactively.
