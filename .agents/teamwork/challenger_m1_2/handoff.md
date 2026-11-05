# Milestone 1 Challenger Handoff Report: Adversarial Stress Testing & Edge Cases

**Challenger**: Challenger 2 (Milestone 1: Core Logic & State Engine)  
**Date**: 2026-11-05T14:39:00Z  
**Verdict**: `REQUEST_CHANGES`  
**Overall Risk Assessment**: MEDIUM-HIGH  

---

## 1. Observation

### 1.1 Unhandled TypeError Crash on Boundary / Out-of-Bounds Coordinates
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines**:
  - `handlePointerDown`: lines 424–442
  - `handlePointerEnter`: lines 475–485
  - `applyTargetToCell`: lines 312–320
- **Verbatim Code**:
  ```typescript
  // lines 424-441
  const handlePointerDown = useCallback(
    (r: number, c: number, isSecondaryClick = false) => {
      if (status === 'WON' || status === 'LOST') return;

      isPointerDownRef.current = true;
      currentDragBatchRef.current = [];
      visitedCellsRef.current = new Set();
      visitedCellsRef.current.add(`${r},${c}`);

      const activeTool: ToolMode = isSecondaryClick
        ? toolMode === 'FILL'
          ? 'CROSS'
          : 'FILL'
        : toolMode;

      activeDragToolRef.current = activeTool;

      const currentVal = gridRef.current[r][c]; // <-- Line 441: Unchecked r and c!
  ```
  ```typescript
  // lines 312-317
  const applyTargetToCell = useCallback(
    (r: number, c: number, targetVal: CellState, tool: ToolMode) => {
      if (status === 'WON' || status === 'LOST') return;

      const currentVal = gridRef.current[r][c]; // <-- Line 316: Unchecked r and c!
      const shouldBeFilled = currentPuzzle.solution[r][c] === 1; // <-- Line 317: Unchecked r and c!
  ```
- **Observed Behavior**:
  When `handlePointerDown` or `handlePointerEnter` is invoked with `r < 0`, `r >= currentPuzzle.height`, `c < 0`, or `c >= currentPuzzle.width`:
  `gridRef.current[r]` evaluates to `undefined`, and `gridRef.current[r][c]` throws an uncaught JavaScript runtime error:
  `TypeError: Cannot read properties of undefined (reading '0')`
- **Tool Command & Output**:
  ```bash
  $ npx tsx src/games/nonogram/nonogramEngine.test.ts
  ```
  ```text
  ======================================================
  🧪 SUITE 2: Boundary Checks & Input Robustness
  ======================================================
    ❌ FAIL: handlePointerDown(-1, 0) does not throw uncaught error (caught: Cannot read properties of undefined (reading '0'))
    ❌ FAIL: handlePointerDown(height, 0) does not throw uncaught error (caught: Cannot read properties of undefined (reading '0'))
    ❌ FAIL: handlePointerEnter with out-of-bounds coords during active drag does not throw uncaught error (caught: Cannot read properties of undefined (reading '0'))
  ```

### 1.2 Rapid Undo / Redo & Branching Robustness (PASSED)
- In `src/games/nonogram/nonogramEngine.test.ts` Suite 1:
  - 10-step move sequence followed by 10 consecutive `undo()` calls cleanly restored the grid to all 0s.
  - 10 consecutive `redo()` calls cleanly restored the grid to all 1s.
  - History branching (3 undos followed by a new move on cell `(4, 2)`) immediately cleared `redoStackRef` and set `canRedo === false`.
  - Multi-cell drag strokes (5 cells dragged in a single gesture) recorded as a single batch and were undone / redone in a single atomic step.
  - Line completions (`completedRows`) were removed on undo and restored on redo.

### 1.3 15x15 Puzzles & Puzzle Switching (PASSED)
- In `src/games/nonogram/nonogramEngine.test.ts` Suite 3 & Suite 6:
  - Zero-clue rows (`[0]`) on `hard_invader` (rows 0, 13, 14 and cols 0, 1, 13, 14) are pre-evaluated as completed upon initial hook mount.
  - Switching from `hard_invader` to `hard_skull` mid-game cleanly resets mistakes, timer, score, undo stack, and redo stack.
  - Solving all 15x15 cells of `hard_invader` transitions status to `'WON'`, awarding 1570 score and 3 stars.
  - `restart()` from `'WON'` or `'LOST'` restores the hook to `'READY'`.

### 1.4 Classic Mode Mistakes, Drag Cutoff, & Solved-Cell Safety (PASSED)
- In `src/games/nonogram/nonogramEngine.test.ts` Suite 4:
  - Touching an already-filled cell (`1`) with CROSS or an already-crossed cell (`2`) with FILL is safely ignored without penalties.
  - A mistake in Classic mode auto-marks the cell as `2` (`X`), increments `mistakes` from 0 to 1, and immediately sets `isPointerDownRef.current = false`.
  - Drag cutoff was empirically verified: subsequent pointer-enter events during the halted gesture did NOT trigger additional mistakes, protecting players from instant 3-heart death.
  - Upon 3 mistakes, `status` transitioned to `'LOST'`, and subsequent pointer clicks and undos were disabled.

### 1.5 TypeScript Typecheck and Project Build (PASSED)
- `npx tsc --noEmit` exited with code 0 (zero errors).
- `npm run build` compiled all 34 routes successfully with Turbopack and static generation.

---

## 2. Logic Chain

1. **Observation 1.1** establishes that `handlePointerDown`, `handlePointerEnter`, and `applyTargetToCell` make direct array index lookups `gridRef.current[r][c]` and `currentPuzzle.solution[r][c]` without validating that `0 <= r < currentPuzzle.height` and `0 <= c < currentPuzzle.width`.
2. In Milestone 3 (Requirement F7: "Mobile Touch Drag Support: touch-none, elementFromPoint mapping, release pointer capture"), touch drag gestures calculate target cells using `document.elementFromPoint(touch.clientX, touch.clientY)` or pointer events.
3. During rapid touch swipes or mouse dragging, fingers or cursors frequently cross into padding, outer wrappers, or row/column clue headers, where parsed dataset indices may be out-of-bounds, negative, or undefined.
4. Because the core engine currently lacks coordinate validation, receiving any out-of-bounds coordinate immediately triggers an unhandled `TypeError: Cannot read properties of undefined (reading '0')`, crashing the React render tree in production.
5. Defending the state engine with explicit boundary guards (`if (r < 0 || r >= currentPuzzle.height || c < 0 || c >= currentPuzzle.width) return;`) prevents crashes regardless of what coordinates the presentation layer passes.
6. Therefore, the logic engine requires changes before Milestone 1 can be considered safely sealed.

---

## 3. Caveats

- **Scope Boundary**: Challenger 2 operates under a strictly enforced review-only constraint ("Review-only — do NOT modify implementation code"). Worker M1 owns `useNonogramEngine.ts` and will apply the boundary guard fix.
- **Test Suite Location**: The automated stress test suite is maintained in `src/games/nonogram/nonogramEngine.test.ts` (14 KB, 91 assertions across 6 suites), following the repository convention established by `src/games/eggpop/utils/hexGrid.test.ts`.

---

## 4. Adversarial Review Challenges

### Challenge Summary
- **Overall risk assessment**: MEDIUM-HIGH

### Challenge 1 (High): Missing Boundary Validation in Pointer Event Handlers
- **Assumption challenged**: The engine assumed that caller components will always supply valid, in-bounds grid coordinates `(r, c)`.
- **Attack scenario**: Fast finger swiping on mobile touchscreens drifts outside the grid into board borders or clue headers; or pointer event listener fires while cursor is outside the board boundary.
- **Blast radius**: Uncaught JavaScript `TypeError`, causing React component tree unmount/crash.
- **Mitigation**: Add guard clauses at the top of `applyTargetToCell`, `handlePointerDown`, and `handlePointerEnter`:
  ```typescript
  if (r < 0 || r >= currentPuzzle.height || c < 0 || c >= currentPuzzle.width) {
    return;
  }
  ```

---

## 5. Conclusion & Actionable Fix for Worker M1

**Verdict**: `REQUEST_CHANGES`

Worker M1 has successfully implemented F1 (Bidirectional lines), F2 (Zero-clue line initialization), F3 (Drag state machine & cutoff), F4 (Solved-cell safety), and F5 (Reactive undo/redo stack) with high quality. However, Worker M1 must add the following boundary checks to `src/games/nonogram/useNonogramEngine.ts`:

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

---

## 6. Verification Method

1. **Run the Stress Test Suite**:
   ```bash
   npx tsx src/games/nonogram/nonogramEngine.test.ts
   ```
   - Current result: 88 passed, 3 failed on out-of-bounds pointer events.
   - Expected result after fix: 91 passed, 0 failed.

2. **Verify TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   - Expected result: Exit code 0, 0 errors.

3. **Verify Project Build**:
   ```bash
   npm run build
   ```
   - Expected result: Exit code 0, 34/34 pages generated.
