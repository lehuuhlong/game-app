export interface FlappyGameState {
  score: number;
  highScore: number;
  isPlaying: boolean;
  isGameOver: boolean;
  isNewHighScore?: boolean;
  currentSpeed?: number;
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

export interface FlappyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}
