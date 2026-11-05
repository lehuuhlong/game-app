/**
 * Adversarial Stress-Testing Suite for Neon Nonogram Engine
 * Covers:
 * - Suite 1: Rapid Undo / Redo Sequences & History Branching
 * - Suite 2: Boundary Checks & Input Robustness
 * - Suite 3: 15x15 Puzzles, Zero-Clue Lines, & Puzzle Switching / Restart
 * - Suite 4: Classic Mode Mistake Accumulation, Drag Cutoff, & Solved-Cell Safety
 * - Suite 5: Line Completion Bidirectionality & Overfill Invalidation
 *
 * Run with: npx tsx src/games/nonogram/nonogramEngine.test.ts
 */

import React from 'react';
import { useNonogramEngine } from './useNonogramEngine';
import { PUZZLES } from './puzzles';
import { UseNonogramEngineReturn } from './types';

// ============================================================================
// Lightweight React Hook Harness for Headless Testing
// ============================================================================
interface HookHarness<T> {
  result: { current: T };
  renderCount: number;
  rerender: () => void;
  unmount: () => void;
}

function renderHook<T>(hookFn: () => T): HookHarness<T> {
  const hooks: any[] = [];
  let hookIndex = 0;
  let renderCount = 0;
  const effects: Array<{ effect: () => (() => void) | void; deps?: any[]; cleanup?: (() => void) | void; hasChanged?: boolean }> = [];
  let isRendering = false;
  let hasPendingRerender = false;

  const result: { current: T } = { current: null as any };

  const customDispatcher = {
    useState: (initial: any) => {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setState = (action: any) => {
        const nextVal = typeof action === 'function' ? action(hooks[idx]) : action;
        if (nextVal !== hooks[idx]) {
          hooks[idx] = nextVal;
          if (isRendering) {
            hasPendingRerender = true;
          } else {
            runRenderLoop();
          }
        }
      };
      return [hooks[idx], setState];
    },

    useRef: (initial: any) => {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = { current: initial };
      }
      return hooks[idx];
    },

    useCallback: (fn: any, deps: any[]) => {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = { fn, deps };
      } else {
        hooks[idx] = { fn, deps };
      }
      return fn;
    },

    useEffect: (effect: any, deps?: any[]) => {
      const idx = hookIndex++;
      const prev = hooks[idx];
      let hasChanged = true;
      if (prev && deps && prev.deps) {
        hasChanged = deps.some((d, i) => !Object.is(d, prev.deps[i]));
      }
      hooks[idx] = { effect, deps, hasChanged };
      effects.push(hooks[idx]);
    },
  };

  function executeEffects() {
    for (const eff of effects) {
      if (eff.hasChanged) {
        if (typeof eff.cleanup === 'function') {
          eff.cleanup();
        }
        eff.cleanup = eff.effect();
        eff.hasChanged = false;
      }
    }
    effects.length = 0;
  }

  function runRenderLoop() {
    let loopCount = 0;
    do {
      hasPendingRerender = false;
      isRendering = true;
      hookIndex = 0;
      (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H = customDispatcher;
      result.current = hookFn();
      isRendering = false;
      renderCount++;
      executeEffects();
      loopCount++;
      if (loopCount > 50) {
        throw new Error('Too many re-renders in hook execution (infinite loop)');
      }
    } while (hasPendingRerender);
  }

  // Initial render
  runRenderLoop();

  return {
    result,
    get renderCount() {
      return renderCount;
    },
    rerender: () => {
      runRenderLoop();
    },
    unmount: () => {
      for (const eff of hooks) {
        if (eff && typeof eff.cleanup === 'function') {
          eff.cleanup();
        }
      }
    },
  };
}

// ============================================================================
// Test Suite Infrastructure
// ============================================================================
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    failures.push(msg);
    console.error(`  ❌ FAIL: ${msg}`);
  }
}

// ============================================================================
// SUITE 1: Rapid Undo / Redo Sequences & History Branching
// ============================================================================
console.log('\n======================================================');
console.log('🧪 SUITE 1: Rapid Undo / Redo Sequences & Branching');
console.log('======================================================');

const { result: engine } = renderHook(() => useNonogramEngine('easy_heart'));
const heart = PUZZLES.find((p) => p.id === 'easy_heart')!;

// Initial state
assert(!engine.current.canUndo, 'canUndo is false on initial mount');
assert(!engine.current.canRedo, 'canRedo is false on initial mount');

// Test 1.1: Single move -> Undo -> Redo
// easy_heart solution cell (0, 1) is 1
engine.current.handlePointerDown(0, 1);
engine.current.handlePointerUp();

assert(engine.current.grid[0][1] === 1, 'Cell (0,1) filled to 1');
assert(engine.current.canUndo === true, 'canUndo is true after 1 move');
assert(engine.current.canRedo === false, 'canRedo is false after 1 move');

engine.current.undo();
assert(engine.current.grid[0][1] === 0, 'Cell (0,1) reverted to 0 after undo');
assert(engine.current.canUndo === false, 'canUndo is false after undoing only move');
assert(engine.current.canRedo === true, 'canRedo is true after undo');

engine.current.redo();
assert(engine.current.grid[0][1] === 1, 'Cell (0,1) restored to 1 after redo');
assert(engine.current.canUndo === true, 'canUndo is true after redo');
assert(engine.current.canRedo === false, 'canRedo is false after redo');

// Test 1.2: Deep sequence of 10 consecutive moves, then 10 undos, then 10 redos
engine.current.restart();
const moveSequence: [number, number][] = [
  [0, 1], [0, 3],
  [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
  [2, 0], [2, 1], [2, 2],
];

for (const [r, c] of moveSequence) {
  engine.current.handlePointerDown(r, c);
  engine.current.handlePointerUp();
}

assert(engine.current.canUndo === true, 'canUndo true after 10 moves');
assert(engine.current.canRedo === false, 'canRedo false after 10 moves');
assert(moveSequence.every(([r, c]) => engine.current.grid[r][c] === 1), 'All 10 cells filled');

// 10 Rapid Undos
for (let i = 0; i < 10; i++) {
  engine.current.undo();
}
assert(engine.current.canUndo === false, 'canUndo false after 10 undos');
assert(engine.current.canRedo === true, 'canRedo true after 10 undos');
assert(moveSequence.every(([r, c]) => engine.current.grid[r][c] === 0), 'All 10 cells reverted to 0');

// 10 Rapid Redos
for (let i = 0; i < 10; i++) {
  engine.current.redo();
}
assert(engine.current.canUndo === true, 'canUndo true after 10 redos');
assert(engine.current.canRedo === false, 'canRedo false after 10 redos');
assert(moveSequence.every(([r, c]) => engine.current.grid[r][c] === 1), 'All 10 cells restored to 1');

// Test 1.3: History branching
// Undo 3 moves, then make a different move -> redo stack must be purged
engine.current.undo();
engine.current.undo();
engine.current.undo();
assert(engine.current.canRedo === true, 'canRedo true with 3 pending redos');

// New move on cell (4, 2)
engine.current.handlePointerDown(4, 2);
engine.current.handlePointerUp();

assert(engine.current.canRedo === false, 'New move clears redo stack (canRedo is false)');
assert(engine.current.grid[4][2] === 1, 'New move applied to (4,2)');

// Test 1.4: Multi-cell drag batch undo / redo
engine.current.restart();
// Drag stroke across row 1: (1,0) -> (1,1) -> (1,2) -> (1,3) -> (1,4)
engine.current.handlePointerDown(1, 0);
engine.current.handlePointerEnter(1, 1);
engine.current.handlePointerEnter(1, 2);
engine.current.handlePointerEnter(1, 3);
engine.current.handlePointerEnter(1, 4);
engine.current.handlePointerUp();

assert(
  [0, 1, 2, 3, 4].every((c) => engine.current.grid[1][c] === 1),
  'Multi-cell drag stroke filled entire row 1'
);
assert(engine.current.completedRows.has(1), 'Row 1 is marked completed');

// Single undo must revert all 5 cells in one batch!
engine.current.undo();
assert(
  [0, 1, 2, 3, 4].every((c) => engine.current.grid[1][c] === 0),
  'Single undo reverts all 5 cells in batch stroke simultaneously'
);
assert(!engine.current.completedRows.has(1), 'Row 1 completed status reverted on undo');

// Single redo must restore all 5 cells simultaneously!
engine.current.redo();
assert(
  [0, 1, 2, 3, 4].every((c) => engine.current.grid[1][c] === 1),
  'Single redo restores all 5 cells in batch stroke simultaneously'
);
assert(engine.current.completedRows.has(1), 'Row 1 completed status restored on redo');

// Test 1.5: Calling undo/redo when empty does not crash or corrupt
engine.current.restart();
engine.current.undo(); // no-op
engine.current.undo(); // no-op
assert(!engine.current.canUndo, 'Excess undo on empty stack is safe no-op');
engine.current.redo(); // no-op
engine.current.redo(); // no-op
assert(!engine.current.canRedo, 'Excess redo on empty stack is safe no-op');

// ============================================================================
// SUITE 2: Boundary Checks & Input Robustness
// ============================================================================
console.log('\n======================================================');
console.log('🧪 SUITE 2: Boundary Checks & Input Robustness');
console.log('======================================================');

engine.current.restart();

// Test 2.1: Out of bounds coordinates in handlePointerDown / handlePointerEnter
let oobDownThrew = false;
let oobDownError: any = null;
try {
  engine.current.handlePointerDown(-1, 0);
} catch (e) {
  oobDownThrew = true;
  oobDownError = e;
}
assert(!oobDownThrew, `handlePointerDown(-1, 0) does not throw uncaught error (caught: ${oobDownError?.message})`);

let oobDownMaxThrew = false;
let oobDownMaxError: any = null;
try {
  engine.current.handlePointerDown(5, 0); // 5 is out of bounds for 5x5
} catch (e) {
  oobDownMaxThrew = true;
  oobDownMaxError = e;
}
assert(!oobDownMaxThrew, `handlePointerDown(height, 0) does not throw uncaught error (caught: ${oobDownMaxError?.message})`);

// Active drag entering out of bounds coords:
let oobEnterThrew = false;
let oobEnterError: any = null;
try {
  engine.current.restart();
  engine.current.handlePointerDown(0, 1); // cell (0, 1) is valid and correct fill
  engine.current.handlePointerEnter(-1, 0); // negative row during active drag!
  engine.current.handlePointerEnter(0, -1); // negative col during active drag!
  engine.current.handlePointerEnter(10, 10); // out of bounds row/col during active drag!
  engine.current.handlePointerUp();
} catch (e) {
  oobEnterThrew = true;
  oobEnterError = e;
}
assert(!oobEnterThrew, `handlePointerEnter with out-of-bounds coords during active drag does not throw uncaught error (caught: ${oobEnterError?.message})`);

// Test 2.2: Empty / orphan pointer events
engine.current.restart();
let orphanUpThrew = false;
try {
  engine.current.handlePointerUp(); // pointerUp without pointerDown
  engine.current.handlePointerEnter(0, 0); // pointerEnter without pointerDown
  engine.current.handlePointerUp();
} catch (e) {
  orphanUpThrew = true;
}
assert(!orphanUpThrew, 'Orphan pointerUp / pointerEnter events without pointerDown do not crash');
assert(!engine.current.canUndo, 'Orphan pointer events do not create spurious undo history');

// ============================================================================
// SUITE 3: 15x15 Puzzles, Zero-Clue Lines, & Puzzle Switching / Restart
// ============================================================================
console.log('\n======================================================');
console.log('🧪 SUITE 3: 15x15 Puzzles, Zero-Clues, & Switching');
console.log('======================================================');

const invader = PUZZLES.find((p) => p.id === 'hard_invader')!;
const { result: invaderEngine } = renderHook(() => useNonogramEngine('hard_invader'));

// Test 3.1: 15x15 dimensions
assert(invaderEngine.current.currentPuzzle.width === 15, '15x15 puzzle width is 15');
assert(invaderEngine.current.currentPuzzle.height === 15, '15x15 puzzle height is 15');
assert(invaderEngine.current.grid.length === 15, 'Grid height is 15');
assert(invaderEngine.current.grid[0].length === 15, 'Grid width is 15');

// Test 3.2: Zero-clue lines in hard_invader:
// In hard_invader solution:
// rows 0, 13, 14 are all 0 -> rowClues are [0]
// cols 0, 1, 13, 14 are all 0 -> colClues are [0]
assert(
  invaderEngine.current.completedRows.has(0) &&
  invaderEngine.current.completedRows.has(13) &&
  invaderEngine.current.completedRows.has(14),
  'Zero-clue rows (0, 13, 14) are pre-evaluated as completed on initial load'
);
assert(
  invaderEngine.current.completedCols.has(0) &&
  invaderEngine.current.completedCols.has(1) &&
  invaderEngine.current.completedCols.has(13) &&
  invaderEngine.current.completedCols.has(14),
  'Zero-clue cols (0, 1, 13, 14) are pre-evaluated as completed on initial load'
);
assert(
  !invaderEngine.current.completedRows.has(5),
  'Non-zero clue row (row 5) is NOT marked completed on empty grid'
);

// Test 3.3: Puzzle switching mid-game clean reset
const skull = PUZZLES.find((p) => p.id === 'hard_skull')!;
invaderEngine.current.handlePointerDown(1, 4); // make a move
invaderEngine.current.handlePointerUp();
assert(invaderEngine.current.canUndo === true, 'Move recorded in invader');

// Switch to skull
invaderEngine.current.selectPuzzle(skull);
assert(invaderEngine.current.currentPuzzle.id === 'hard_skull', 'Switched to hard_skull');
assert(!invaderEngine.current.canUndo, 'canUndo reset to false after puzzle switch');
assert(!invaderEngine.current.canRedo, 'canRedo reset to false after puzzle switch');
assert(invaderEngine.current.status === 'READY', 'Status reset to READY after puzzle switch');
assert(invaderEngine.current.mistakes === 0, 'Mistakes reset to 0 after puzzle switch');
assert(
  invaderEngine.current.grid.every((row) => row.every((c) => c === 0)),
  'Grid fully cleared to 0s after puzzle switch'
);

// Test 3.4: Restart clean reset
invaderEngine.current.handlePointerDown(0, 4);
invaderEngine.current.handlePointerUp();
invaderEngine.current.restart();
assert(!invaderEngine.current.canUndo, 'canUndo reset after restart');
assert(invaderEngine.current.status === 'READY', 'Status reset to READY after restart');

// ============================================================================
// SUITE 4: Classic Mode Mistake Accumulation, Drag Cutoff, & Solved-Cell Safety
// ============================================================================
console.log('\n======================================================');
console.log('🧪 SUITE 4: Classic Mode Mistakes, Drag Cutoff, Safety');
console.log('======================================================');

const { result: classicEngine } = renderHook(() => useNonogramEngine('easy_heart'));
classicEngine.current.setGameMode('CLASSIC');

// easy_heart solution cell (0, 0) is 0 (should NOT be filled)
// Cell (0, 1) is 1 (should be filled)
// Cell (0, 2) is 0 (should NOT be filled)

// Test 4.1: Solved-cell safety (F4)
// Correctly fill cell (0, 1)
classicEngine.current.handlePointerDown(0, 1);
classicEngine.current.handlePointerUp();
assert(classicEngine.current.grid[0][1] === 1, 'Cell (0,1) filled correctly');
assert(classicEngine.current.mistakes === 0, 'No mistakes for correct fill');

// Now, with CROSS tool (secondary click or tool change), click on the already-filled cell (0, 1)
classicEngine.current.handlePointerDown(0, 1, true); // secondary click = CROSS
classicEngine.current.handlePointerUp();
assert(
  classicEngine.current.mistakes === 0,
  'Solved-cell safety: CROSS on already-filled cell (1) does NOT cause mistake'
);
assert(classicEngine.current.grid[0][1] === 1, 'Cell (0,1) remains value 1');

// Correctly mark cell (0, 0) with CROSS
classicEngine.current.handlePointerDown(0, 0, true); // secondary click = CROSS on cell that is 0
classicEngine.current.handlePointerUp();
assert(classicEngine.current.grid[0][0] === 2, 'Cell (0,0) marked as CROSS (2)');
assert(classicEngine.current.mistakes === 0, 'No mistakes for correct cross');

// Now click on already-crossed cell (0, 0) with FILL tool
classicEngine.current.handlePointerDown(0, 0, false); // primary click = FILL
classicEngine.current.handlePointerUp();
assert(
  classicEngine.current.mistakes === 0,
  'Solved-cell safety: FILL on already-crossed cell (2) does NOT cause mistake'
);
assert(classicEngine.current.grid[0][0] === 2, 'Cell (0,0) remains value 2');

// Test 4.2: Drag Cutoff on mistake (F3)
// Cell (0, 2) is 0. Cell (0, 4) is 0. Both are empty in solution.
// If player starts a drag with FILL on (0, 2), it is a mistake.
// In the same drag stroke, pointer enters (0, 4).
// Drag cutoff MUST prevent the 2nd cell from causing a 2nd mistake!
classicEngine.current.handlePointerDown(0, 2); // MISTAKE on cell (0, 2)
assert(classicEngine.current.mistakes === 1, 'Mistake 1 recorded on (0,2)');
assert(classicEngine.current.grid[0][2] === 2, 'Mistake cell auto-marked as 2 (X)');

// Pointer continues into cell (0, 4)
classicEngine.current.handlePointerEnter(0, 4);
assert(
  classicEngine.current.mistakes === 1,
  'Drag cutoff: entering subsequent mistake cell during halted drag does NOT add mistake'
);
assert(classicEngine.current.grid[0][4] === 0, 'Subsequent cell untouched due to drag cutoff');
classicEngine.current.handlePointerUp();

// Test 4.3: 3 Mistakes -> Game Over (LOST)
// Mistake 2 on cell (4, 0) (solution has 0 at 4,0)
classicEngine.current.handlePointerDown(4, 0);
classicEngine.current.handlePointerUp();
assert(classicEngine.current.mistakes === 2, 'Mistake 2 recorded');
assert(classicEngine.current.status === 'PLAYING', 'Status is still PLAYING at 2 mistakes');

// Mistake 3 on cell (4, 4) (solution has 0 at 4,4)
classicEngine.current.handlePointerDown(4, 4);
classicEngine.current.handlePointerUp();
assert(classicEngine.current.mistakes === 3, 'Mistake 3 recorded');
assert(classicEngine.current.status === 'LOST', 'Game status transitions to LOST at 3 mistakes');
assert(!classicEngine.current.canUndo, 'canUndo is false when status is LOST');
assert(!classicEngine.current.canRedo, 'canRedo is false when status is LOST');

// Subsequent clicks ignored when LOST
classicEngine.current.handlePointerDown(1, 0);
classicEngine.current.handlePointerUp();
assert(classicEngine.current.grid[1][0] === 0, 'Moves blocked after game over (status: LOST)');

// ============================================================================
// SUITE 5: Line Completion Bidirectionality & Complete Victory Check
// ============================================================================
console.log('\n======================================================');
console.log('🧪 SUITE 5: Line Completion Bidirectionality & Victory');
console.log('======================================================');

const { result: solveEngine } = renderHook(() => useNonogramEngine('easy_heart'));
// easy_heart solution:
// [0, 1, 0, 1, 0] (Row 0: needs col 1, 3)
// [1, 1, 1, 1, 1] (Row 1: needs col 0, 1, 2, 3, 4)
// [1, 1, 1, 1, 1] (Row 2: needs col 0, 1, 2, 3, 4)
// [0, 1, 1, 1, 0] (Row 3: needs col 1, 2, 3)
// [0, 0, 1, 0, 0] (Row 4: needs col 2)

// Complete Row 0:
solveEngine.current.handlePointerDown(0, 1);
solveEngine.current.handlePointerUp();
assert(!solveEngine.current.completedRows.has(0), 'Row 0 incomplete with only 1 of 2 cells');

solveEngine.current.handlePointerDown(0, 3);
solveEngine.current.handlePointerUp();
assert(solveEngine.current.completedRows.has(0), 'Row 0 marked complete after both cells filled');

// Now erase cell (0, 3): Row 0 must become incomplete!
solveEngine.current.handlePointerDown(0, 3); // clicking 1 with FILL tool erases to 0
solveEngine.current.handlePointerUp();
assert(solveEngine.current.grid[0][3] === 0, 'Cell (0,3) erased to 0');
assert(!solveEngine.current.completedRows.has(0), 'Row 0 bidirectional: completion removed on erase');

// Re-fill cell (0, 3)
solveEngine.current.handlePointerDown(0, 3);
solveEngine.current.handlePointerUp();
assert(solveEngine.current.completedRows.has(0), 'Row 0 re-marked complete');

// Complete entire puzzle and verify victory!
for (let r = 0; r < heart.height; r++) {
  for (let c = 0; c < heart.width; c++) {
    if (heart.solution[r][c] === 1 && solveEngine.current.grid[r][c] !== 1) {
      solveEngine.current.handlePointerDown(r, c);
      solveEngine.current.handlePointerUp();
    }
  }
}

assert(solveEngine.current.status === 'WON', 'Puzzle completion transitions status to WON');
assert(solveEngine.current.score > 0, `Victory awards score: ${solveEngine.current.score}`);
assert(solveEngine.current.stars >= 1, `Victory awards stars: ${solveEngine.current.stars}`);
assert(!solveEngine.current.canUndo, 'canUndo is false after WON');
assert(!solveEngine.current.canRedo, 'canRedo is false after WON');

// ============================================================================
// SUITE 6: Full 15x15 Victory & Mid-Drag Undo Stress
// ============================================================================
console.log('\n======================================================');
console.log('🧪 SUITE 6: Full 15x15 Victory & Mid-Drag Undo Stress');
console.log('======================================================');

// Test 6.1: Solve entire 15x15 hard_invader puzzle
const { result: invaderSolveEngine } = renderHook(() => useNonogramEngine('hard_invader'));
for (let r = 0; r < invader.height; r++) {
  for (let c = 0; c < invader.width; c++) {
    if (invader.solution[r][c] === 1) {
      invaderSolveEngine.current.handlePointerDown(r, c);
      invaderSolveEngine.current.handlePointerUp();
    }
  }
}
assert(invaderSolveEngine.current.status === 'WON', '15x15 puzzle completion triggers status WON');
assert(invaderSolveEngine.current.score >= 600, `15x15 HARD puzzle awards >= 600 score (got ${invaderSolveEngine.current.score})`);
assert(invaderSolveEngine.current.stars >= 1, `15x15 HARD puzzle awards stars (got ${invaderSolveEngine.current.stars})`);

// Test 6.2: Restart from WON status recovers clean state
invaderSolveEngine.current.restart();
assert(invaderSolveEngine.current.status === 'READY', 'Restart from WON status sets status to READY');
assert(!invaderSolveEngine.current.canUndo, 'canUndo is false after restart from WON');
assert(invaderSolveEngine.current.mistakes === 0, 'Mistakes is 0 after restart from WON');

// Test 6.3: Mid-drag undo stress
// If player presses down and undos mid-drag
const { result: midDragEngine } = renderHook(() => useNonogramEngine('easy_heart'));
// Make move 1
midDragEngine.current.handlePointerDown(0, 1);
midDragEngine.current.handlePointerUp();
assert(midDragEngine.current.grid[0][1] === 1, 'Move 1 done');

// Now start drag on (1, 1), but before pointerUp, undo is triggered
midDragEngine.current.handlePointerDown(1, 1);
assert(midDragEngine.current.grid[1][1] === 1, 'Cell (1,1) painted in active drag');
midDragEngine.current.undo(); // undo called while pointer is down!
// What did undo revert? Move 1 on (0, 1)!
assert(midDragEngine.current.grid[0][1] === 0, 'Cell (0,1) reverted by mid-drag undo');

// Now pointerUp finishes the current drag batch
midDragEngine.current.handlePointerUp();
assert(midDragEngine.current.canUndo === true, 'canUndo true after pointerUp');

// Summary
console.log('\n======================================================');
console.log(`🏁 TEST SUMMARY: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('FAILURES:');
  for (const f of failures) {
    console.log(` - ${f}`);
  }
}
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
