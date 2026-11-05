# Survey Phase Handoff Report: Explorer 1 (Logic & Clue Audit)

**Agent**: Explorer 1  
**Milestone**: Survey  
**Date**: 2026-11-05T14:15:00Z  
**Target Module**: `src/games/nonogram/` (Core Logic, Clues, Line Completion, Victory Evaluation, Cell Transitions, Undo Stack, Security & Scoring)

---

## 1. Observation

Direct observations from source code inspection and static analysis:

### 1.1 Line Completion Invalidation & Desynchronization
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines 80–114**:
  ```typescript
  // Check row rIndex
  let rowValid = true;
  for (let c = 0; c < puzzle.width; c++) {
    const shouldBeFilled = puzzle.solution[rIndex][c] === 1;
    const isFilled = currentGrid[rIndex][c] === 1;
    if (shouldBeFilled !== isFilled) {
      rowValid = false;
      break;
    }
  }
  if (rowValid && !newCompRows.has(rIndex)) {
    newCompRows.add(rIndex);
    lineCompletedSound = true;
  }

  // Check col cIndex
  let colValid = true;
  for (let r = 0; r < puzzle.height; r++) {
    const shouldBeFilled = puzzle.solution[r][cIndex] === 1;
    const isFilled = currentGrid[r][cIndex] === 1;
    if (shouldBeFilled !== isFilled) {
      colValid = false;
      break;
    }
  }
  if (colValid && !newCompCols.has(cIndex)) {
    newCompCols.add(cIndex);
    lineCompletedSound = true;
  }

  if (lineCompletedSound) {
    setCompletedRows(newCompRows);
    setCompletedCols(newCompCols);
    Sounds.playLineCompleteSound();
  }
  ```
- **Observed Behavior**:
  - `newCompRows.add(rIndex)` is executed when `rowValid` is true.
  - When `rowValid` is `false` (e.g., user un-fills a cell, makes an error in Zen mode, or changes state), `newCompRows.delete(rIndex)` is NEVER called.
  - State updates (`setCompletedRows`, `setCompletedCols`) are conditional upon `if (lineCompletedSound)`. An invalidated line NEVER triggers state updates.

### 1.2 Undo Ignores Line Completion Status
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines 341–355**:
  ```typescript
  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0 || status === 'WON' || status === 'LOST') return;
    const lastBatch = undoStackRef.current.pop();
    if (!lastBatch || lastBatch.length === 0) return;

    setGrid((prevGrid) => {
      const nextGrid = prevGrid.map((row) => [...row]);
      for (const move of lastBatch) {
        nextGrid[move.row][move.col] = move.prevValue;
      }
      return nextGrid;
    });

    Sounds.playUndoSound();
  }, [status]);
  ```
- **Observed Behavior**: `undo()` restores `grid` cells from `lastBatch`, but does not recalculate or update `completedRows` or `completedCols`.

### 1.3 Zero-Clue Lines Uninitialized at Puzzle Load
- **File**: `src/games/nonogram/puzzles.ts` (lines 24, 41) and `useNonogramEngine.ts` (lines 68–69)
  - `hard_invader`: Row 0, Row 13, Row 14, Col 0, Col 1, Col 13, Col 14 are all `0` (solution has 0 filled cells, clue is `[0]`).
  - `hard_skull`: Row 14, Col 0, Col 14 are all `0`.
  - `hard_crown`: Row 0, Row 13, Row 14, Col 0, Col 14 are all `0`.
  - `med_gamepad`: Row 0, Row 9 are all `0`.
  - `med_diamond`: Row 9 is all `0`.
- In `selectPuzzle`:
  ```typescript
  setCompletedRows(new Set());
  setCompletedCols(new Set());
  ```
- **Observed Behavior**: Because `checkLineCompletion` is only invoked inside `applyCellChange(r, c)` on user interaction, lines with clue `[0]` are never verified or struck through at start. A player who solves all positive clues without touching zero-clue lines wins with un-checked zero clues in the background. If a player touches a zero-clue line with `FILL` in Classic mode, they suffer an unfair life deduction.

### 1.4 Right-Click Drag Reverts to Primary Tool on Drag Enter
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines 254–277**:
  ```typescript
  const handlePointerDown = useCallback(
    (r: number, c: number, isSecondaryClick = false) => {
      isPointerDownRef.current = true;
      currentDragBatchRef.current = [];

      const activeTool: ToolMode = isSecondaryClick
        ? toolMode === 'FILL'
          ? 'CROSS'
          : 'FILL'
        : toolMode;

      dragTargetValueRef.current = activeTool === 'FILL' ? 1 : 2;
      applyCellChange(r, c, activeTool);
    },
    [toolMode, applyCellChange]
  );

  const handlePointerEnter = useCallback(
    (r: number, c: number) => {
      if (!isPointerDownRef.current) return;
      applyCellChange(r, c, toolMode); // <-- FORCED toolMode, ignores isSecondaryClick/activeTool!
    },
    [toolMode, applyCellChange]
  );
  ```
- **Observed Behavior**: If `toolMode` is `FILL` and the user right-clicks to drag-mark X, cell (0, 0) receives CROSS, but moving to cell (0, 1) invokes `applyCellChange(0, 1, toolMode)`, filling cell (0, 1) with neon color instead of CROSS.

### 1.5 Dragging Toggles Cells Randomly Instead of Painting
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines 39, 168–194, 265, 281**:
  - `dragTargetValueRef` is defined on line 39 and written on line 265, but NEVER read anywhere in `applyCellChange`.
  - Line 169: `if (currentVal === 1) newVal = 0;`
  - Line 183: `if (currentVal === 2) newVal = 0;`
- **Observed Behavior**: Dragging across already set cells inverts them back to 0. Re-entering cells during a drag flips them repeatedly, corrupting the grid.

### 1.6 Penalty on Interacting with Already-Resolved Cells in Classic Mode
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines 168–194**:
  ```typescript
  if (intendedTool === 'FILL') {
    if (currentVal === 1) {
      newVal = 0;
    } else {
      if (gameMode === 'CLASSIC' && !shouldBeFilled) {
        isMistake = true;
        newVal = 2;
      } else {
        newVal = 1;
      }
    }
  } else {
    if (currentVal === 2) {
      newVal = 0;
    } else {
      if (gameMode === 'CLASSIC' && shouldBeFilled) {
        isMistake = true;
        newVal = 1;
      } else {
        newVal = 2;
      }
    }
  }
  ```
- **Observed Behavior**:
  - If a cell is ALREADY 1 (correctly filled), clicking it with `CROSS` tool triggers `shouldBeFilled === true` -> `isMistake = true`! Player loses a heart for clicking an already-solved cell.
  - If a cell is ALREADY 2 (marked as X), clicking it with `FILL` tool triggers `!shouldBeFilled === true` -> `isMistake = true`! Player loses a heart for clicking an already-revealed X.
  - Three accidental drags over already-resolved cells trigger immediate Game Over.

### 1.7 `canUndo` Reactivity Failure Due to Mutable Ref
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines 40, 283, 378**:
  - `undoStackRef = useRef<MoveAction[][]>([])`
  - `canUndo: undoStackRef.current.length > 0`
  - On `handlePointerUp`: `undoStackRef.current.push([...currentDragBatchRef.current])`
- **Observed Behavior**: `handlePointerUp` mutates a ref without triggering a React render. The Undo button (`disabled={!canUndo}`) remains disabled after placing moves until an unrelated state update (e.g. the 1-second timer tick) re-renders the component.

### 1.8 Hard Difficulty Maximum Score (1562+) Exceeds Security Threshold (1500)
- **File**: `src/games/nonogram/useNonogramEngine.ts` (lines 133–139) & `src/lib/gameSecurity.ts` (lines 221–224):
  - In `useNonogramEngine.ts`:
    - `basePoints = 600` (HARD)
    - `targetTime = 480`
    - Fast solve at 5 seconds: `timeBonus = Math.floor((480 - 5) * 1.5) = 712`
    - `mistakeBonus = 150`
    - `hintBonus = 100`
    - `totalScore = 600 + 712 + 150 + 100 = 1562`
  - In `src/lib/gameSecurity.ts`:
    ```typescript
    if (score > 1500) {
      return { valid: false, reason: 'Nonogram score exceeds maximum realistic threshold' };
    }
    ```
- **Observed Behavior**: Legitimate human players completing a Hard puzzle with high speed and zero mistakes are rejected by the anti-cheat validator as cheaters (`valid: false`).

### 1.9 Score Submission HTTP 405 Method Not Allowed
- **File**: `src/games/nonogram/GameNonogram.tsx` (lines 126–135) & `src/app/api/users/[id]/score/route.ts` (line 50):
  - `GameNonogram.tsx`:
    ```typescript
    await fetch(`/api/users/${user.id}/score`, {
      method: 'POST', // <-- BUG!
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'nonogram', score, sessionToken }),
    });
    ```
  - `src/app/api/users/[id]/score/route.ts`:
    ```typescript
    export async function PATCH(request: Request, ...)
    ```
- **Observed Behavior**: The endpoint only handles `PATCH`. The call always returns HTTP 405 Method Not Allowed, and player high scores are never saved to MongoDB. In addition, `duration` is missing from the request payload.

### 1.10 Stale Consumed Session Reused on Restart / Next Puzzle
- **File**: `src/games/nonogram/GameNonogram.tsx` (lines 58–63) & `src/hooks/useGameSession.ts`:
  - `GameNonogram.tsx`:
    ```typescript
    // Restart session when status moves from READY to PLAYING
    useEffect(() => {
      if (status === 'PLAYING') {
        scoreSavedRef.current = false;
        // startSession(user?.id, user?.username, true) is NEVER called!
      }
    }, [status]);
    ```
- **Observed Behavior**: `startSession` is only called once on initial mount. When a player completes puzzle 1, the session token is consumed. When they proceed to puzzle 2, `ensureSessionToken` reuses the spent token, triggering HTTP 409 Conflict / 403 on subsequent score submission.

### 1.11 Missing Metadata Registration in Discovery Pages
- **File**: `src/app/games/page.tsx:25-43` and `src/components/landing/GameCard3D.tsx:20-36`:
  - `GAME_DURATIONS` and `ESTIMATED_DURATIONS` maps do not have `'nonogram': '3–10m'`.

---

## 2. Logic Chain

1. **Premise 1 (Line Checking)**: A line completion indicator must be bidirectional: if a row satisfies the solution it must be marked, and if it ceases to satisfy the solution (via cell modification or undo), it must be un-marked.
   - *From Observation 1.1*: Because `checkLineCompletion` lacks deletion logic and only calls state setters when `lineCompletedSound` is true, once a line is marked complete it can never be unmarked.
   - *From Observation 1.2*: Because `undo()` never touches `completedRows`/`completedCols`, reverting a move keeps the struck-through clues intact.
   - *Deduction*: False positive line completions are guaranteed to occur during normal gameplay whenever users edit or undo cells.

2. **Premise 2 (Zero-Clue Lines)**: Lines with 0 required filled cells have solution arrays of `[0, ..., 0]` and clues of `[0]`.
   - *From Observation 1.3*: The current engine leaves all-zero lines un-evaluated at start. The only way to complete them is to click them, but clicking with FILL inflicts a mistake.
   - *Deduction*: Players cannot strike through zero clues legitimately without clicking with CROSS on empty cells, and completing the puzzle leaves zero clues untouched.

3. **Premise 3 (Tool & Pointer Semantics)**: A drag gesture is a single continuous operation governed by the initial tool and intent (paint vs clear).
   - *From Observation 1.4 & 1.5*: Right-click drag flips to primary tool on the second cell, and moving over existing cells toggles them.
   - *Deduction*: Drag-drawing is fundamentally broken on desktop right-click and erratic on multiple cells.

4. **Premise 4 (Rule Fairness & Penalty Rules)**: Mistakes in Nonogram games represent invalid deductions (trying to fill a space that must remain empty, or crossing a space that must be filled). Interacting with already-solved cells should never penalize the player.
   - *From Observation 1.6 & 1.7*: Solved cells are not guarded. Inadvertently dragging or clicking a tool over an existing solved cell deducts lives. Dragging over 3 cells kills the player in milliseconds.
   - *Deduction*: The penalty system contains critical false positives that punish players for dragging over their own correct answers.

5. **Premise 5 (Anti-Cheat & Security Contract)**: Score thresholds in `gameSecurity.ts` must accommodate the maximum mathematically possible legitimate score generated by the engine.
   - *From Observation 1.8*: Max engine score for Hard is 1562+, while `gameSecurity.ts` rejects any score > 1500.
   - *Deduction*: Top legitimate players will inevitably have their high scores rejected as cheaters.

6. **Premise 6 (Backend Protocol Compliance)**: The score API endpoint requires `PATCH` and consumes sessions atomically.
   - *From Observation 1.9 & 1.10*: `GameNonogram.tsx` sends `POST` (HTTP 405) and fails to renew the session token on subsequent games.
   - *Deduction*: Zero high scores are currently recorded for any user in production.

---

## 3. Caveats

- **Web Audio Implementation**: Sounds were inspected to ensure correct function calls exist (`playFillSound`, `playCrossSound`, `playLineCompleteSound`, `playMistakeSound`, `playUndoSound`, `playVictorySound`). Deep audio clicking/ramp-down safety and lazy context initialization fall under Explorer 2 / Audio Specialist scope.
- **Mobile Touch Handling**: While `touch-action: none` and pointer capture deficiencies were noted in pointer logic, detailed mobile layout and viewport responsiveness will be expanded by UX/Mobile specialists.

---

## 4. Conclusion

The Nonogram puzzle engine currently exhibits **12 distinct defects**, spanning line completion false positives, undo desynchronization, fatal drag toggle behavior, excessive penalty triggers on solved cells, security score threshold clipping, and complete failure of high score persistence due to HTTP method mismatch.

### Concrete Fix Recommendations

1. **`useNonogramEngine.ts` Line Completion**:
   - Refactor `checkLineCompletion` to accept `(grid, r, c, puzzle)` or implement a deterministic line evaluation function.
   - When checking row `r`: if `rowValid`, `newCompRows.add(r)`; else `newCompRows.delete(r)`. Symmetrically for col `c`.
   - Track `const hasChanged = ...`. If changed, commit `setCompletedRows` and `setCompletedCols`. Only play sound when a line transitions from incomplete to complete.
   - In `selectPuzzle`: Pre-calculate completed lines so that all-zero lines (or completed initial states) are accurately reflected.

2. **`useNonogramEngine.ts` Undo/Redo**:
   - In `undo()`, re-evaluate line completions for all rows/cols affected by the undone batch.
   - Expose an `undoCount` state or state-backed stack so `canUndo` reactively updates in the UI.

3. **`useNonogramEngine.ts` Drag & Cell State Transitions**:
   - In `handlePointerDown`: Store `currentDragToolRef.current = activeTool`.
   - In `handlePointerEnter`: Use `currentDragToolRef.current`, NOT `toolMode`.
   - Determine drag intent: if starting cell was empty, set target value to `activeTool === 'FILL' ? 1 : 2`. Only update cells that do not already match the target value.
   - Guard already resolved cells: In Classic mode, if `currentVal === 1` and tool is `CROSS`, or if `currentVal === 2` and tool is `FILL`, ignore without mistake penalty.
   - On mistake during drag in Classic mode, cancel dragging (`isPointerDownRef.current = false`) to prevent rapid 3-heart death.

4. **`src/lib/gameSecurity.ts` Score Threshold**:
   - Update threshold from `score > 1500` to `score > 2000` to safely accommodate fast Hard puzzle completions (max ~1600).

5. **`GameNonogram.tsx` Score Submission**:
   - Change `fetch('/api/users/${user.id}/score', { method: 'POST' })` to `method: 'PATCH'`.
   - Include `duration: elapsed || timer` in request payload.
   - Add `startSession(user?.id, user?.username, true)` when restarting or transitioning to a new puzzle.

6. **Registration in Discovery Pages**:
   - Add `'nonogram': '3–10m'` to `GAME_DURATIONS` in `src/app/games/page.tsx` and `ESTIMATED_DURATIONS` in `src/components/landing/GameCard3D.tsx`.

---

## 5. Verification Method

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
2. **Line Completion Bidirectional Test**:
   - Load any 5x5 puzzle (e.g. Neon Heart).
   - Fill row 1 (all 5 cells). Verify row 1 clue strikes through and sound plays.
   - Un-fill one cell in row 1. Verify row 1 clue strike-through is removed immediately.
   - Re-fill cell. Verify clue strikes through again.
   - Click Undo. Verify clue strike-through is removed again.
3. **Right-Click Drag Test**:
   - With tool set to `FILL`, hold right mouse button and drag across 3 cells.
   - Verify all 3 cells are marked with CROSS (`✕`), with zero cells filled neon.
4. **Classic Solved-Cell Safety Test**:
   - Fill a correct cell. Switch to CROSS tool. Click on the filled cell.
   - Verify no mistake sound plays and no heart is deducted.
5. **Score Submission Test**:
   - Complete any puzzle and monitor Network tab / test endpoint.
   - Verify `PATCH /api/users/[id]/score` returns `200 OK` with updated `bestScoreNonogram`.
   - Complete a second puzzle; verify new session token is acquired and accepted without 409 conflict.
