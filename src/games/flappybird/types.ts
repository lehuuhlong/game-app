export interface FlappyGameState {
  score: number;
  highScore: number;
  isPlaying: boolean;
  isGameOver: boolean;
}

export interface FlappyConfig {
  canvasWidth: number;
  canvasHeight: number;
}

export interface FlappyPipe {
  x: number;
  gapY: number;
  gapSize: number;
  scored: boolean;
}

