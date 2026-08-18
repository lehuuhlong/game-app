export type Screen = "lobby" | "waiting" | "playing" | "finished";

export interface CapturedPieces {
  capturedByWhite: string[]; // Pieces taken from black (lowercase: p, r, n, b, q)
  capturedByBlack: string[]; // Pieces taken from white (uppercase: P, R, N, B, Q)
}

export interface ChessBoardCustomStyles {
  [square: string]: React.CSSProperties;
}
