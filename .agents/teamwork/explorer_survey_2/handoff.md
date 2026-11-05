# Survey Handoff Report: Interaction & Mobile/Desktop UX Audit for Neon Nonogram

- **Auditor**: Explorer 2 (Interaction & Mobile/Desktop UX Specialist)
- **Phase**: Survey / Discovery
- **Target Files**:
  - `src/games/nonogram/GameNonogram.tsx`
  - `src/games/nonogram/useNonogramEngine.ts`
  - `src/games/nonogram/types.ts`
  - `src/games/nonogram/sounds.ts`
  - `src/app/games/nonogram/page.tsx`
  - Related Backend & Security: `src/app/api/games/session/route.ts`, `src/app/api/users/[id]/score/route.ts`, `src/lib/gameSecurity.ts`

---

## 1. Observation

Direct observations from source code inspection:

### Observation 1: Fast-Drag Concurrency & State Overwrite Race Condition
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines**: 162, 199–201, 211, 271–276
- **Verbatim Code**:
  ```ts
  162: const currentVal = grid[r][c];
  ...
  199: const nextGrid = grid.map((rowArr, rowIdx) =>
  200:   rowIdx === r ? rowArr.map((cell, colIdx) => (colIdx === c ? newVal : cell)) : [...rowArr]
  201: );
  ...
  211: setGrid(nextGrid);
  ```
  `applyCellChange` closes over the static `grid` state reference from the previous render. It derives `nextGrid` using `grid.map(...)` and calls `setGrid(nextGrid)` without a functional updater (`setGrid(prev => ...)`). When a pointer enters multiple cells in rapid succession before React finishes re-rendering, each subsequent event calculates its new grid from the stale closed-over `grid`, overwriting earlier cells changed during the same drag stroke and dropping moves.

### Observation 2: Chaotic Drag Inversion Instead of Uniform Paint/Erase (`dragTargetValueRef` Dead Code)
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines**: 39, 168–194, 256–267, 271–276
- **Verbatim Code**:
  ```ts
  39: const dragTargetValueRef = useRef<CellState | null>(null);
  ...
  265: dragTargetValueRef.current = activeTool === 'FILL' ? 1 : 2;
  266: applyCellChange(r, c, activeTool);
  ...
  271: const handlePointerEnter = useCallback(
  272:   (r: number, c: number) => {
  273:     if (!isPointerDownRef.current) return;
  274:     applyCellChange(r, c, toolMode);
  275:   },
  276:   [toolMode, applyCellChange]
  277: );
  ```
  `dragTargetValueRef` is initialized on line 265 and reset to `null` on line 281, but is **never read anywhere** in `applyCellChange` or `handlePointerEnter`. Instead, `handlePointerEnter` executes `applyCellChange`, which unconditionally toggles cells:
  - If cell is 1, toggles to 0. If 0, toggles to 1.
  - Dragging across a mixed row of filled and empty cells inverts every cell instead of uniformly painting or erasing.
  - Dragging back across the starting cell immediately undoes the starting cell.
  - Cells already processed within `currentDragBatchRef` are not guarded, resulting in rapid toggle flickering.

### Observation 3: Right-Click Drag Loses Secondary Tool State
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines**: 259–266, 271–276
- **Verbatim Code**:
  ```ts
  259: const activeTool: ToolMode = isSecondaryClick
  260:   ? toolMode === 'FILL'
  261:     ? 'CROSS'
  262:     : 'FILL'
  263:   : toolMode;
  ...
  274: applyCellChange(r, c, toolMode);
  ```
  When the player right-clicks (secondary click) to start a drag, `handlePointerDown` correctly flips the tool to `CROSS` (when `toolMode === 'FILL'`). However, `handlePointerEnter` hardcodes `applyCellChange(r, c, toolMode)`. Thus, cell (0, 0) receives CROSS, but cells (0, 1), (0, 2), etc. receive FILL, violating right-click drag expectations.

### Observation 4: Total Failure of Touch Dragging on Mobile (Implicit Pointer Capture)
- **File**: `src/games/nonogram/GameNonogram.tsx`
- **Lines**: 470–478
- **Verbatim Code**:
  ```tsx
  470: <div
  471:   key={cIdx}
  472:   onPointerDown={(e) => {
  473:     e.preventDefault();
  474:     handlePointerDown(rIdx, cIdx, e.button === 2);
  475:   }}
  476:   onPointerEnter={() => handlePointerEnter(rIdx, cIdx)}
  477:   onContextMenu={(e) => e.preventDefault()}
  ```
  In all standard mobile browsers (Safari on iOS, Chrome on Android), a touch `pointerdown` automatically gives the target element **implicit pointer capture**. Subsequent `pointerenter` events on neighboring elements **never fire**. Touching and sliding across cells on mobile only edits the first cell touched.

### Observation 5: Missing CSS `touch-action: none` Causing Mobile Panning Conflicts
- **File**: `src/games/nonogram/GameNonogram.tsx`
- **Lines**: 385–387, 470–493
- The board container and cell elements have no `touch-none` (`touch-action: none`) styling. Touching and sliding on a mobile screen triggers browser-level viewport panning/scrolling rather than game drag interactions. `e.preventDefault()` inside React's synthetic `onPointerDown` does not reliably cancel browser compositor touch scrolling.

### Observation 6: Pointer Down Stuck (Pointer Leak) on Pointer Cancel or Blur
- **File**: `src/games/nonogram/GameNonogram.tsx`
- **Lines**: 65–69
- **Verbatim Code**:
  ```tsx
  66: useEffect(() => {
  67:   window.addEventListener('pointerup', handlePointerUp);
  68:   return () => window.removeEventListener('pointerup', handlePointerUp);
  69: }, [handlePointerUp]);
  ```
  There are no listeners for `pointercancel` or `blur`. When a mobile notification, gesture, or window blur occurs while pointer is held down, `isPointerDownRef.current` remains stuck at `true`, causing involuntary cell painting upon return.

### Observation 7: Auxiliary Mouse Buttons Trigger Left-Click Moves
- **File**: `src/games/nonogram/GameNonogram.tsx`
- **Line**: 474: `handlePointerDown(rIdx, cIdx, e.button === 2);`
  Middle-click (`e.button === 1`) and auxiliary buttons (3, 4) evaluate `e.button === 2` to `false`, executing primary click moves unexpectedly.

### Observation 8: Incomplete Context Menu Suppression
- **File**: `src/games/nonogram/GameNonogram.tsx`
- **Line**: 477
  `onContextMenu={(e) => e.preventDefault()}` is placed only on each cell `<div>`. Right-clicking on row clue headers, column clue headers, the corner box (`R \ C`), or border spaces triggers the browser's context menu.

### Observation 9: Stale `canUndo` State in UI
- **File**: `src/games/nonogram/useNonogramEngine.ts` (lines 40, 283, 378) and `GameNonogram.tsx` (line 362)
- **Verbatim Code**:
  ```ts
  40: const undoStackRef = useRef<MoveAction[][]>([]);
  ...
  283: undoStackRef.current.push([...currentDragBatchRef.current]);
  ...
  378: canUndo: undoStackRef.current.length > 0,
  ```
  Pushing to `undoStackRef.current` in `handlePointerUp` does not trigger a React render. The Undo button (`disabled={!canUndo}`) remains disabled immediately after the user makes a move until an unrelated render occurs (e.g. 1-second timer tick). In `READY` state, the button remains disabled until a second action is taken.

### Observation 10: Missing Redo Stack
- Requirement R2 requires "Undo/redo stack operations and state synchronization." `useNonogramEngine.ts` has no `redoStackRef`, no `redo()` method, no `canRedo` indicator, and no `Ctrl+Y` or `Ctrl+Shift+Z` keyboard handlers.

### Observation 11: `completedRows` and `completedCols` Desynchronization on Undo and Modification
- **File**: `src/games/nonogram/useNonogramEngine.ts`
- **Lines**: 74–117, 341–355
- **Verbatim Code**:
  ```ts
  90: if (rowValid && !newCompRows.has(rIndex)) {
  91:   newCompRows.add(rIndex);
  92:   lineCompletedSound = true;
  93: }
  ```
  `checkLineCompletion` only adds completed indices; it never removes an index if a cell is subsequently emptied (`!rowValid`). Furthermore, `undo()` modifies `grid` but does not re-evaluate `completedRows` or `completedCols`. As a result, row/column clues remain permanently struck through (`line-through opacity-35`) even when incomplete.

### Observation 12: Missing Spacebar and C Tool Toggle Shortcuts
- **File**: `src/games/nonogram/GameNonogram.tsx`
- **Lines**: 71–94
  Only keys '1', 'f', '2', 'x' are handled. There is no single toggle key (`Space` or `c`), and pressing Space on desktop may scroll the browser page.

### Observation 13: Horizontal Viewport Overflow on Screens < 480px
- **File**: `src/games/nonogram/GameNonogram.tsx`
- **Lines**: 177–204, 385–387
- Dimensions:
  - 5x5: `cell` 56px * 5 + `rowHeaderWidth` 80px = 360px + 32px padding = 392px.
  - 10x10: `cell` 32px * 10 + `rowHeaderWidth` 80px = 400px + 32px padding = 432px.
  - 15x15: `cell` 24px * 15 + `rowHeaderWidth` 96px = 456px + 32px padding = 488px.
  There is no `overflow-x-auto` wrapper around the board. On mobile screens (iPhone SE 375px, Android 360px, iPhone 14 390px), columns 10–15 clip off-screen and are untappable.

### Observation 14: Mobile HUD Wrapping & Cluttered Control Bar
- **File**: `src/games/nonogram/GameNonogram.tsx`
- **Lines**: 284–381
  Row 2 places 3 difficulty buttons, 2 tool toggle pills, timer, 3 hearts, undo, and hint buttons into a single flex container. On mobile viewports, this wraps into 3–4 jagged rows, consuming extensive vertical space above the board.

### Observation 15: Score Submission Fails Due to HTTP Method Mismatch (POST vs PATCH) & Missing Session Registration
- **File**: `src/games/nonogram/GameNonogram.tsx` (lines 126–135) & `src/app/api/users/[id]/score/route.ts` (lines 50–53) & `src/app/api/games/session/route.ts` (lines 12–31)
- `GameNonogram.tsx` sends `POST /api/users/${user.id}/score`, but `score/route.ts` only exports `PATCH`, returning HTTP 405 Method Not Allowed.
- `src/app/api/games/session/route.ts` `VALID_GAMES` does not include `'nonogram'`, causing `startSession` to return HTTP 400 Bad Request.

### Observation 16: Missing Anti-Cheat Rules for Nonogram in `src/lib/gameSecurity.ts`
- **File**: `src/lib/gameSecurity.ts`
- **Lines**: 29–300
  `validateGameScore` lacks `case 'nonogram':`, defaulting to `{ valid: true }` without checking impossible completion times or maximum score limits.

### Observation 17: Web Audio GainNode Memory Leak on Every Cell Click
- **File**: `src/games/nonogram/sounds.ts`
- **Lines**: 66–70, 89–93, 112–116, 137–141
  Oscillators stop after sound playback, but `gain.connect(ctx.destination)` is never disconnected. Each cell click and drag step permanently retains GainNodes in the AudioContext graph.

---

## 2. Logic Chain

1. **Drag Behavior Flaws (Observations 1, 2, 3)**:
   - Because `applyCellChange` accesses the closure's `grid` variable and sets state asynchronously with `setGrid(nextGrid)`, subsequent events in a fast drag read outdated grid state.
   - Because `dragTargetValueRef` is never read and `applyCellChange` contains unconditional inversion logic, dragging inverts cells rather than painting uniform target values.
   - Because `activeTool` is not stored in a persistent drag ref, right-click dragging immediately reverts to `toolMode` on the second cell.
   - **Conclusion**: A continuous drag engine with `gridRef`, `activeDragToolRef`, and `dragTargetValueRef` is required to achieve standard Nonogram paint/erase semantics.

2. **Mobile Touch & Event Handling Flaws (Observations 4, 5, 6, 7, 8)**:
   - Modern touch devices use implicit pointer capture on `pointerdown`. Because capture is neither released nor bypassed via `elementFromPoint`, `onPointerEnter` never fires on adjacent cells during a touch swipe.
   - Without `touch-action: none`, browser touch listeners claim gestures for viewport scrolling.
   - Without `pointercancel` and `blur` listeners, interrupted drag states remain active indefinitely.
   - **Conclusion**: Mobile drag requires `touch-none`, pointer capture release or coordinate-based `elementFromPoint` hit testing, and comprehensive event cancellation listeners.

3. **Undo/Redo & State Synchronization Flaws (Observations 9, 10, 11)**:
   - Storing undo batches in `undoStackRef` without reactive state causes `canUndo` to remain stale after pointer up.
   - Reverting moves in `undo()` without re-checking row/column completion leaves satisfied headers struck through on invalid grids.
   - `checkLineCompletion` lacking deletion logic causes struck-through clues to persist even when cells are manually cleared.
   - **Conclusion**: `useNonogramEngine` requires reactive undo/redo counters, a `redoStackRef`, and bidirectional `checkLineCompletion` executed during moves and undo/redo operations.

4. **Mobile Layout & Responsiveness Flaws (Observations 12, 13, 14)**:
   - A minimum grid width of 392px to 488px without an `overflow-x-auto` wrapper guarantees layout breakage on smartphones (< 480px).
   - Crammed control bars with 8+ buttons create jagged multi-line header layouts on mobile.
   - **Conclusion**: Board container needs `w-full max-w-full overflow-x-auto`, compact mobile cell/header scales, and a responsive HUD hierarchy.

5. **API & Security Integration Flaws (Observations 15, 16, 17)**:
   - Calling POST on a PATCH-only endpoint guarantees submission failure.
   - Omitting `nonogram` from `VALID_GAMES` in `/api/games/session` breaks session token generation.
   - Omitting anti-cheat bounds allows spoofed sub-second puzzle completions.
   - **Conclusion**: Frontend method must be changed to PATCH, `nonogram` registered in session route, anti-cheat thresholds added, and GainNodes disconnected on playback end.

---

## 3. Caveats

- **Scope Boundary**: This investigation is read-only. Source code modifications must be implemented by the implementation agents in the subsequent phase.
- **Puzzle Design**: The puzzle dimensions (5x5, 10x10, 15x15) in `puzzles.ts` are structurally sound, and their solutions match their clue counts. The issues identified relate purely to controls, interaction handling, state management, layout responsiveness, and backend integration.
- **Auto-X Feature**: Auto-filling X's on completed lines is a common Nonogram convenience feature. While not strictly required by R2, bidirectional clue strikeout synchronization is mandatory.

---

## 4. Conclusion & Concrete Fix Strategy

The interaction engine in `GameNonogram.tsx` and `useNonogramEngine.ts` requires targeted refactoring across 6 functional areas:

| Area | Component / File | Concrete Action Required |
|---|---|---|
| **Drag Engine** | `useNonogramEngine.ts` | 1. Maintain `gridRef` for synchronous multi-cell drag updates.<br>2. Track `activeDragToolRef` ('FILL' vs 'CROSS') and `dragTargetValueRef` (1 vs 2 vs 0 for erase).<br>3. Track `visitedCellsRef: Set<string>` to prevent multiple toggles of the same cell within one drag gesture.<br>4. Stop drag on game over. |
| **Touch Support** | `GameNonogram.tsx` | 1. Add `touch-none` to grid container and cell elements.<br>2. Add `releasePointerCapture(e.pointerId)` on `pointerdown`.<br>3. Add `onPointerMove` with `document.elementFromPoint` to track cells under touch coordinates.<br>4. Listen for `pointercancel` and `blur` to reset drag state. |
| **Undo / Redo** | `useNonogramEngine.ts` | 1. Implement `undoStackRef`, `redoStackRef`, `undo()`, `redo()`.<br>2. Expose reactive `canUndo` and `canRedo` backed by state.<br>3. Re-evaluate `checkLineCompletion` bidirectionally on move, undo, and redo. |
| **Desktop Controls** | `GameNonogram.tsx` | 1. Bind `Space` to toggle between FILL and CROSS (`e.preventDefault()`).<br>2. Bind `c` for CROSS, `Ctrl+Y` / `Ctrl+Shift+Z` for redo.<br>3. Ignore `e.button !== 0 && e.button !== 2`.<br>4. Suppress context menu on entire board container. |
| **Mobile UX** | `GameNonogram.tsx` | 1. Add `overflow-x-auto max-w-full pb-4` to board container.<br>2. Reduce row clue width (`w-14 sm:w-20`) and cell sizes (`w-11 sm:w-14` for 5x5, `w-7 sm:w-8` for 10x10, `w-5.5 sm:w-6` for 15x15).<br>3. Reorganize HUD into mobile-friendly control bar with large touch targets. |
| **Backend & Security** | `GameNonogram.tsx`, `gameSecurity.ts`, `session/route.ts` | 1. Change `/api/users/[id]/score` method from `POST` to `PATCH`.<br>2. Add `'nonogram'` to `VALID_GAMES` in `src/app/api/games/session/route.ts`.<br>3. Add Nonogram validation to `validateGameScore` in `src/lib/gameSecurity.ts`.<br>4. Disconnect Web Audio GainNodes on `osc.onended`. |

---

## 5. Verification Method

To independently verify the bugs and subsequent fixes:

1. **Touch Dragging Reproduction**:
   - Open Chrome DevTools -> Device Toolbar (e.g. iPhone 12/14, 390px width).
   - In Touch mode, touch down on cell (0, 0) and drag across row 0.
   - *Current Bug*: Only cell (0, 0) reacts. Subsequent cells remain empty.
   - *Verification Criteria*: Continuous touch drag updates all cells along the drag path.

2. **Drag Overwrite & Inversion Test**:
   - Fill cell (0, 0).
   - Start drag on cell (0, 1) [empty] with FILL tool and drag across cell (0, 0) to cell (0, 2).
   - *Current Bug*: Cell (0, 0) inverts back to empty (0).
   - *Verification Criteria*: Cell (0, 0) remains filled (1); only empty cells are painted to 1.

3. **Right-Click Drag Test**:
   - With FILL tool selected, right-click down on cell (0, 0) and drag across row 0.
   - *Current Bug*: Cell (0, 0) becomes X (2), but cells (0, 1) and (0, 2) become FILL (1).
   - *Verification Criteria*: All cells along the right-click drag stroke become X (2).

4. **Clue Strikeout Synchronization on Undo**:
   - Fill all cells in row 0 to trigger line completion (numbers strike through).
   - Click Undo (or press Z).
   - *Current Bug*: Cell reverts to empty, but numbers remain struck through.
   - *Verification Criteria*: Row numbers immediately un-strike and return to full opacity.

5. **Mobile Viewport Overflow Audit**:
   - Set viewport to 360px x 640px.
   - Select 10x10 and 15x15 puzzles.
   - *Current Bug*: Board overflows horizontally off-screen, clipping columns 10–15 with no scrollbar.
   - *Verification Criteria*: Board container scrolls smoothly horizontally without breaking page layout.

6. **Score Submission Network Audit**:
   - Complete any puzzle and inspect Network tab.
   - *Current Bug*: `POST /api/users/[id]/score` returns 405 Method Not Allowed; `/api/games/session` returns 400.
   - *Verification Criteria*: `POST /api/games/session` returns 200 with sessionToken; `PATCH /api/users/[id]/score` returns 200 with updated best score.

7. **TypeScript & Build Verification**:
   - Run `npx tsc --noEmit` -> Must exit with code 0.
   - Run `npm run build` -> Must complete with zero errors.
