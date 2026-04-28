import type { CellValue, Player } from "./types";

const WIN_LENGTH = 5;

/**
 * Check if placing `player` at (row, col) on `board` results in a win.
 * Returns the winning cells if so, null otherwise.
 */
export function checkWin(
  board: CellValue[][],
  row: number,
  col: number,
  player: Player
): { row: number; col: number }[] | null {
  const size = board.length;
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal ↘
    [1, -1],  // diagonal ↙
  ];

  for (const [dr, dc] of directions) {
    const cells: { row: number; col: number }[] = [{ row, col }];
    let blockedEnds = 0;

    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (
        r >= 0 && r < size &&
        c >= 0 && c < size &&
        board[r][c] === player
      ) {
        cells.push({ row: r, col: c });
        r += dr * sign;
        c += dc * sign;
      }

      if (r < 0 || r >= size || c < 0 || c >= size) {
        blockedEnds++;
      } else if (board[r][c] !== null && board[r][c] !== player) {
        blockedEnds++;
      }
    }

    if (cells.length >= WIN_LENGTH) {
      if (cells.length === WIN_LENGTH && blockedEnds === 2) {
        // 5 in a row but blocked at both ends -> not a win
        continue;
      }
      return cells;
    }
  }

  return null;
}
