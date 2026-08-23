import { ShipType, ShipPlacement } from '@/types/socket';

// ── Grid Constants ──────────────────────────────────────────────
export const GRID_SIZE = 10;
export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
export const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// ── Ship Config ─────────────────────────────────────────────────
export const SHIPS_CONFIG: { type: ShipType; length: number; label: string }[] = [
  { type: 'carrier', length: 5, label: 'Carrier' },
  { type: 'battleship', length: 4, label: 'Battleship' },
  { type: 'cruiser', length: 3, label: 'Cruiser' },
  { type: 'submarine', length: 3, label: 'Submarine' },
  { type: 'destroyer', length: 2, label: 'Destroyer' },
];

// ── Shot Types ──────────────────────────────────────────────────
/** Extended result that includes 'pending' for optimistic UI */
export type ShotResult = 'hit' | 'miss' | 'sunk' | 'pending';

export interface Shot {
  x: number;
  y: number;
  result: ShotResult;
}

// ── Ship Visual Helpers ─────────────────────────────────────────
export type ShipPart = 'bow' | 'stern' | 'body';

/** Ship color palette based on type */
export const SHIP_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  carrier:    { bg: 'bg-sky-600',   border: 'border-sky-400',   accent: '#38bdf8' },
  battleship: { bg: 'bg-blue-600',  border: 'border-blue-400',  accent: '#3b82f6' },
  cruiser:    { bg: 'bg-amber-600', border: 'border-amber-400', accent: '#f59e0b' },
  submarine:  { bg: 'bg-orange-600',border: 'border-orange-400',accent: '#ea580c' },
  destroyer:  { bg: 'bg-slate-600', border: 'border-slate-400', accent: '#64748b' },
};

/** Determine which part of a ship occupies a cell */
export function getShipPart(x: number, y: number, ship: ShipPlacement): ShipPart {
  if (ship.vertical) {
    if (y === ship.y) return 'bow';
    if (y === ship.y + ship.length - 1) return 'stern';
    return 'body';
  } else {
    if (x === ship.x) return 'bow';
    if (x === ship.x + ship.length - 1) return 'stern';
    return 'body';
  }
}

/** Get border-radius CSS for a ship part */
export function getShipBorderRadius(part: ShipPart, vertical: boolean): string {
  if (part === 'body') return '2px';
  if (vertical) {
    if (part === 'bow')  return '8px 8px 2px 2px';
    if (part === 'stern') return '2px 2px 6px 6px';
  } else {
    if (part === 'bow')  return '8px 2px 2px 8px';
    if (part === 'stern') return '2px 8px 6px 2px';
  }
  return '2px';
}

/** Reconstruct sunk ship placements from shot data using BFS */
export function reconstructSunkShips(shots: Shot[]): ShipPlacement[] {
  const sunkCells = shots.filter(s => s.result === 'sunk');
  if (sunkCells.length === 0) return [];

  const visited = new Set<string>();
  const ships: ShipPlacement[] = [];

  for (const cell of sunkCells) {
    const key = `${cell.x},${cell.y}`;
    if (visited.has(key)) continue;

    const group: { x: number; y: number }[] = [];
    const queue = [{ x: cell.x, y: cell.y }];
    visited.add(key);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      group.push(cur);
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const nk = `${nx},${ny}`;
        if (!visited.has(nk) && sunkCells.some(c => c.x === nx && c.y === ny)) {
          visited.add(nk);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    const allSameX = group.every(c => c.x === group[0].x);
    const vertical = allSameX && group.length > 1;
    const minX = Math.min(...group.map(c => c.x));
    const minY = Math.min(...group.map(c => c.y));
    const length = group.length;

    ships.push({
      type: (SHIPS_CONFIG.find(s => s.length === length)?.type || 'destroyer') as ShipType,
      x: vertical ? group[0].x : minX,
      y: vertical ? minY : group[0].y,
      vertical,
      length,
      hits: length,
    });
  }
  return ships;
}
