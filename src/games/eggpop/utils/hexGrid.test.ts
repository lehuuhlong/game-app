/**
 * Comprehensive test suite for Hex Grid Math, Snapping, Match-3 BFS, and Orphan Drops BFS.
 * Run with: npx tsx src/games/eggpop/utils/hexGrid.test.ts
 */
import {
  EGG_RADIUS,
  EGG_DIAMETER,
  GRID_COLS,
  GRID_ROWS,
  ROW_HEIGHT,
  GRID_TOP_OFFSET,
  getXYFromRowCol,
  getRowColFromXY,
  getNeighbors,
  createEmptyGrid,
  populateGrid,
  findConnectedMatches,
  findFloatingOrphans,
  snapToNearestSlot,
  type Grid,
  type EggColor,
} from './hexGrid';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ ${msg}`);
  }
}

console.log('\n========================================');
console.log('🧪 SUITE 1: Hex Coordinates & Neighbors');
console.log('========================================');

// Test 1: Even/odd rows coordinate roundtrip
for (const [r, c] of [[0, 0], [0, 5], [1, 0], [1, 4], [2, 11], [3, 10]]) {
  const { x, y } = getXYFromRowCol(r, c);
  const back = getRowColFromXY(x, y);
  assert(back.row === r && back.col === c, `Roundtrip (${r},${c}) -> (${x},${y}) -> (${back.row},${back.col})`);
}

// Test 2: Neighbor counts
assert(getNeighbors(2, 5).length === 6, 'Even interior cell (2,5) has 6 neighbors');
assert(getNeighbors(3, 4).length === 6, 'Odd interior cell (3,4) has 6 neighbors');
assert(getNeighbors(0, 0).length <= 3, 'Top-left corner (0,0) has <= 3 neighbors');

console.log('\n========================================');
console.log('🧪 SUITE 2: Snapping to Nearest Valid Slot');
console.log('========================================');

const gridSnap: Grid = createEmptyGrid();
// Add one anchor egg at row 0, col 3
gridSnap[0][3] = { color: '#EF4444', row: 0, col: 3 };

// Flying egg near row 0 col 2 (ceiling attachment)
const posCeil = getXYFromRowCol(0, 2);
const snapCeil = snapToNearestSlot(gridSnap, posCeil.x + 3, posCeil.y + 2);
assert(snapCeil !== null && snapCeil.row === 0 && snapCeil.col === 2, `Snaps to empty ceiling slot (0,2)`);

// Flying egg near row 1, col 3 (adjacent neighbor to (0,3))
const posNeighbor = getXYFromRowCol(1, 3);
const snapNeighbor = snapToNearestSlot(gridSnap, posNeighbor.x - 2, posNeighbor.y + 1);
assert(
  snapNeighbor !== null && (snapNeighbor.row === 1 || snapNeighbor.row === 0),
  `Snaps to valid neighbor of (0,3), got (${snapNeighbor?.row},${snapNeighbor?.col})`
);

// Flying egg at row 5, col 5 (floating in mid-air far from any egg or ceiling)
const posFar = getXYFromRowCol(5, 5);
const snapFar = snapToNearestSlot(gridSnap, posFar.x, posFar.y);
// Must NOT snap to row 5 (which would float in mid-air)! Must snap to a valid attachment point
assert(
  snapFar !== null && (snapFar.row === 0 || (snapFar.row === 1 && (snapFar.col === 2 || snapFar.col === 3))),
  `Never floats in mid-air: snapped to valid cluster slot (${snapFar?.row},${snapFar?.col})`
);

console.log('\n========================================');
console.log('🧪 SUITE 3: Match-3 BFS Graph Algorithm');
console.log('========================================');

const gridMatch: Grid = createEmptyGrid();
const RED: EggColor = '#EF4444';
const BLUE: EggColor = '#3B82F6';
const GREEN: EggColor = '#22C55E';

// Create a cluster of 3 RED eggs: (0,2), (0,3), (1,2)
gridMatch[0][2] = { color: RED, row: 0, col: 2 };
gridMatch[0][3] = { color: RED, row: 0, col: 3 };
gridMatch[1][2] = { color: RED, row: 1, col: 2 };

// Adjacent BLUE egg at (0,4) and GREEN at (1,3)
gridMatch[0][4] = { color: BLUE, row: 0, col: 4 };
gridMatch[1][3] = { color: GREEN, row: 1, col: 3 };

const matchesRed = findConnectedMatches(gridMatch, 0, 2);
assert(matchesRed.length === 3, `Match-3 BFS found exactly 3 connected RED eggs (got ${matchesRed.length})`);
assert(
  matchesRed.some((m) => m.row === 0 && m.col === 2) &&
    matchesRed.some((m) => m.row === 0 && m.col === 3) &&
    matchesRed.some((m) => m.row === 1 && m.col === 2),
  'Match-3 includes all 3 RED positions'
);

// Check starting from (0,4) BLUE: only 1 egg
const matchesBlue = findConnectedMatches(gridMatch, 0, 4);
assert(matchesBlue.length === 1, `Single BLUE egg has match size 1 (will not pop)`);

// Add 2 more RED eggs extending the cluster to size 5
gridMatch[2][2] = { color: RED, row: 2, col: 2 };
gridMatch[2][3] = { color: RED, row: 2, col: 3 };
const matches5 = findConnectedMatches(gridMatch, 0, 2);
assert(matches5.length === 5, `Extended cluster BFS found all 5 connected RED eggs`);

console.log('\n========================================');
console.log('🧪 SUITE 4: Orphan Drops BFS Graph Algorithm');
console.log('========================================');

const gridOrphans: Grid = createEmptyGrid();

// Left branch anchored at (0,0)
gridOrphans[0][0] = { color: BLUE, row: 0, col: 0 };
gridOrphans[1][0] = { color: GREEN, row: 1, col: 0 };
gridOrphans[2][0] = { color: GREEN, row: 2, col: 0 };

// Right branch anchored at (0,5): hanging (1,5) -> (2,5) -> (3,5)
// Notice: col 5 is far from col 0, so no cross-connection
gridOrphans[0][5] = { color: BLUE, row: 0, col: 5 };
gridOrphans[1][5] = { color: RED, row: 1, col: 5 };
gridOrphans[2][5] = { color: RED, row: 2, col: 5 };
gridOrphans[3][5] = { color: RED, row: 3, col: 5 };

// Initially, all eggs are connected to Row 0
const orphansInitial = findFloatingOrphans(gridOrphans);
assert(orphansInitial.length === 0, `Initially 0 orphans (all connected to ceiling)`);

// Now simulate POPPING the bridge egg at (1,5)
console.log('  Simulating pop of bridge egg at (1,5)...');
gridOrphans[1][5] = null;

// The eggs at (2,5) and (3,5) are now floating orphans!
const orphansAfterPop = findFloatingOrphans(gridOrphans);
assert(orphansAfterPop.length === 2, `Found exactly 2 orphans after bridge pop (got ${orphansAfterPop.length})`);
assert(
  orphansAfterPop.some((o) => o.row === 2 && o.col === 5) &&
    orphansAfterPop.some((o) => o.row === 3 && o.col === 5),
  'Orphans identified correctly as (2,5) and (3,5)'
);

// The eggs at (0,0), (1,0), (2,0), (0,5) are still attached to ceiling!
const orphanCoords = new Set(orphansAfterPop.map((o) => `${o.row},${o.col}`));
assert(!orphanCoords.has('0,0') && !orphanCoords.has('1,0') && !orphanCoords.has('2,0') && !orphanCoords.has('0,5'), 'Anchored eggs are NOT orphans');


console.log(`\n========================================`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
