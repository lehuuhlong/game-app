# Milestone 1 Review & Adversarial Audit Report

**Reviewer**: Reviewer 1 (Reviewer & Critic)  
**Target Milestone**: Milestone 1 (Core Logic & State Engine)  
**Target Files Reviewed**:
- `src/games/nonogram/useNonogramEngine.ts`
- `src/games/nonogram/types.ts`
- Associated interfaces in `src/games/nonogram/GameNonogram.tsx` and `src/games/nonogram/puzzles.ts`

**Final Verdict**: `APPROVE`  
**Overall Risk Assessment**: `LOW`  
**Integrity Assessment**: `VERIFIED (No integrity violations detected)`

---

## 1. Observation

Direct code observations from `src/games/nonogram/useNonogramEngine.ts` and `src/games/nonogram/types.ts`:

1. **F1 (Bidirectional Line Completion)**:
   - Location: `useNonogramEngine.ts:198-255` (`evaluateLines`), lines 19-42 (`isRowSatisfied`, `isColSatisfied`).
   - Implementation:
     ```typescript
     for (const r of rowsToCheck) {
       const satisfied = isRowSatisfied(currentGrid, r, puzzle);
       if (satisfied) {
         if (!nextRows.has(r)) {
           nextRows.add(r);
           newlyCompleted = true;
         }
       } else {
         nextRows.delete(r);
       }
     }
     ```
   - Observed behavior: Incomplete lines are deleted (`nextRows.delete(r)`) when a cell in that line is modified or cleared. Sound `Sounds.playLineCompleteSound()` is gated behind `playSoundOnNewCompletion && newlyCompleted`, playing strictly when a line transitions from incomplete to complete, and silenced during undo (`playSoundOnNewCompletion = false`).

2. **F2 (Zero-Clue Line Initialization)**:
   - Location: `useNonogramEngine.ts:48-65` (`getInitialCompletedLines`), lines 115-124 (initial state), lines 175-181 (`selectPuzzle`).
   - Implementation: `getInitialCompletedLines` evaluates rows and columns on the empty grid. Every row or column whose clue is `[0]` requires zero filled cells; an empty grid contains zero filled cells, matching the solution.
   - Observed behavior: Rows and columns with zero clues (`[0]`) are immediately added to `completedRows` and `completedCols` on mount and in `selectPuzzle` without audio feedback.

3. **F3 (Drag Painting State Machine & Synchronous gridRef)**:
   - Location: `useNonogramEngine.ts:86-90` (`gridRef`), lines 128-134 (drag refs), lines 312-421 (`applyTargetToCell`), lines 424-500 (`handlePointerDown`, `handlePointerEnter`, `handlePointerUp`).
   - Implementation:
     - `gridRef.current` is updated synchronously on every cell change, preventing stale React state closures during rapid dragging.
     - `visitedCellsRef` tracks visited `r,c` keys, preventing repeat processing of cells during a single drag stroke.
     - `activeDragToolRef` preserves the tool mode (including secondary right-click inversion) throughout the drag gesture.
     - `dragTargetValueRef` determines initial uniform intent (paint 1, paint 2, or erase 0) and applies it across `handlePointerEnter`.
     - In Classic mode, when a mistake occurs (lines 387-393), dragging is terminated immediately:
       ```typescript
       isPointerDownRef.current = false;
       dragTargetValueRef.current = null;
       activeDragToolRef.current = null;
       ```
       Preventing subsequent entered cells from triggering multi-heart deaths.

4. **F4 (Classic Mode Solved-Cell Safety)**:
   - Location: `useNonogramEngine.ts:322-329` (`applyTargetToCell`) and lines 448-451, 458-461 (`handlePointerDown`).
   - Implementation:
     ```typescript
     if (gameMode === 'CLASSIC') {
       if (currentVal === 1 && tool === 'CROSS') return;
       if (currentVal === 2 && tool === 'FILL') return;
     }
     ```
   - Observed behavior: Solved cells (already filled 1 or already crossed 2) touched with the opposing tool are ignored with zero mistake penalties and zero drag target propagation.

5. **F5 (Reactive Undo & Redo Stack with Line Sync)**:
   - Location: `useNonogramEngine.ts:135-143` (stack refs & counters), lines 557-623 (`undo`, `redo`), `types.ts:44-70` (`UseNonogramEngineReturn`).
   - Implementation:
     - `undoCount` and `redoCount` trigger React state updates so `canUndo` and `canRedo` update reactively.
     - New moves clear `redoStackRef` and reset `redoCount` to 0.
     - Both `undo()` and `redo()` compute affected rows and columns and execute `evaluateLines(nextGrid, affectedRows, affectedCols, currentPuzzle, ...)`.
     - `redo()` triggers `checkVictory` to award victory if the redone move finishes the puzzle.

6. **Integrity & Build Verification**:
   - `npx tsc --noEmit` exited with code 0 (zero errors).
   - `npm run build` completed production compilation in 7.0s and finished all static pages (34/34) including `/games/nonogram` with code 0.
   - Code inspection confirmed zero hardcoded puzzle overrides, zero facade stubs, and zero synthetic bypasses.

---

## 2. Logic Chain

1. **Bidirectional Line Checking (F1)**:
   - Deduction: In Nonograms, line clues reflect current satisfaction. When an incorrect mark is made or a valid mark erased, the line ceases to be satisfied. Maintaining symmetrical `add` and `delete` semantics in `evaluateLines` ensures the visual state of clue striking matches the board state at all times. Guarding `Sounds.playLineCompleteSound()` behind `newlyCompleted` prevents sound spam when editing already-solved lines.

2. **Zero-Clue Line Initialization (F2)**:
   - Deduction: For lines with clue `[0]`, no cells may be filled. On puzzle launch, an empty grid has 0 filled cells. Pre-evaluating lines via `getInitialCompletedLines` guarantees that zero-clue lines are struck through immediately, matching player expectations.

3. **Drag Painting State Machine & Synchronous gridRef (F3)**:
   - Deduction: Rapid pointer gestures can dispatch dozens of events per second, faster than React render cycles. Reading and writing `gridRef.current` synchronously guarantees atomic board transitions. Uniform intent calculation in `handlePointerDown` and tracking via `visitedCellsRef` prevents cell fluttering. Terminating drag on Classic mode mistakes protects players from multi-heart loss.

4. **Solved-Cell Safety (F4)**:
   - Deduction: In Classic mode, cells with value 1 or 2 are confirmed correct. An accidental swipe across an already-solved cell with the opposite tool does not constitute a logical deduction error. Guarding these cells prevents unfair penalties.

5. **Reactive Undo & Redo (F5)**:
   - Deduction: Players need reactive UI feedback (`canUndo`/`canRedo`) immediately upon releasing the pointer. Synchronizing `undoCount`/`redoCount` triggers the required renders. Re-evaluating affected lines during both undo and redo maintains clue visual consistency.

---

## 3. Caveats

- **Presentational UI Integration**: Worker M1 exclusively owns `src/games/nonogram/useNonogramEngine.ts` and `src/games/nonogram/types.ts`. Presentational wiring (such as binding Redo buttons, `Ctrl+Y` keyboard shortcuts, and `touch-none` / `releasePointerCapture` touch handling in `GameNonogram.tsx`) belongs to Milestone 3 (Worker M3). The engine exposes all necessary APIs (`canRedo`, `redo`, `handlePointerDown`, `handlePointerEnter`, `handlePointerUp`).
- **Web Audio Context Node Graph**: Sound methods (`playLineCompleteSound`, `playFillSound`, etc.) are triggered from the engine hook. The internal Web Audio node disconnects and transient click ramp safety in `src/games/nonogram/sounds.ts` belong to Milestone 2 (Worker M2).

---

## 4. Conclusion

Worker M1 has completely, correctly, and genuinely implemented features F1 through F5 without shortcuts, regressions, or integrity violations. All interface contracts are respected, type safety is preserved, and the production build completes with 0 errors.

**Verdict**: `APPROVE`

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Verified Result*: Exits with code 0, 0 errors.

2. **Next.js Production Build**:
   ```bash
   npm run build
   ```
   *Verified Result*: Exits with code 0, 34/34 static routes compiled successfully including `/games/nonogram`.

3. **Zero-Clue Verification Across All Puzzles**:
   Run via `npx tsx`:
   ```typescript
   import('./src/games/nonogram/puzzles').then(m => {
     const { PUZZLES, generateClues } = m.default;
     for (const p of PUZZLES) {
       const clues = generateClues(p.solution);
       const zeroRows = clues.rowClues.map((c, i) => c.length === 1 && c[0] === 0 ? i : -1).filter(i => i >= 0);
       const zeroCols = clues.colClues.map((c, i) => c.length === 1 && c[0] === 0 ? i : -1).filter(i => i >= 0);
       // ... compared with empty grid isRowSatisfied/isColSatisfied
     }
   });
   ```
   *Verified Result*: All zero-clue lines in `med_gamepad`, `med_diamond`, `hard_invader`, `hard_skull`, `hard_crown` matched 100%.

4. **Line Satisfaction & Sound Trigger Verification**:
   - Filled row 1 of `easy_heart` -> `completedRows.has(1)` is `true`, sound triggered (1).
   - Erased cell (1, 2) -> `completedRows.has(1)` is `false`, sound not triggered (1).
   - Re-filled cell (1, 2) -> `completedRows.has(1)` is `true`, sound triggered (2).
   - Marked cell (1, 2) as X -> `completedRows.has(1)` is `false`, sound not triggered (2).

5. **Classic Solved-Cell Safety & Drag Halt**:
   - Cell (0, 1) solved (1), touch with CROSS -> guarded (`mistakes === 0`).
   - Cell (0, 0) crossed (2), touch with FILL -> guarded (`mistakes === 0`).
   - Cell (0, 2) mistake made -> `isPointerDownRef` set to `false`, dragging cancelled, `mistakes === 1`.

6. **Undo/Redo & Line Re-evaluation**:
   - Undo reverted move batch and removed row completion; `canUndo` updated.
   - Redo restored move batch and restored row completion; `canRedo` updated.
   - Subsequent user move cleared `redoStack`.
