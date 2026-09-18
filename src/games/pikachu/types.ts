export interface Point {
  r: number;
  c: number;
}

export interface PathResult {
  valid: boolean;
  path: Point[]; // Sequence of turning points and endpoints from start to end
}

export interface TileItem {
  id: string; // Unique instance id
  type: number; // 0 to N-1 identifier for matching
  name: string;
  emoji: string;
  glowColor: string;
  badgeBg: string;
}

export interface Cell {
  r: number;
  c: number;
  tile: TileItem | null; // null represents empty/cleared cell
  isSelected: boolean;
  isHinted: boolean;
  isRemoving: boolean;
}

export type GravityType =
  | 'none'
  | 'down'
  | 'up'
  | 'left'
  | 'right'
  | 'center-vertical'
  | 'center-horizontal';

export interface LevelConfig {
  level: number;
  name: string;
  description: string;
  rows: number;
  cols: number;
  uniqueTilesCount: number;
  timeLimit: number; // in seconds
  gravity: GravityType;
}

export interface ActivePathAnimation {
  id: string;
  path: Point[];
  color: string;
}
