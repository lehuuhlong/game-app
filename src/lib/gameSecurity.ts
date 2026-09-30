/**
 * Game Security & Sanity Checks.
 *
 * Implements proportional rate-of-score validation, duration checks,
 * and game-specific progression rules to prevent spoofing without harming legitimate players.
 */

export interface GameValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateGameScore(
  game: string,
  score: number,
  durationSeconds: number,
  extraData: Record<string, any> = {}
): GameValidationResult {
  // Basic sanity check: score must be non-negative and finite
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    return { valid: false, reason: 'Score must be a positive finite number' };
  }

  // Basic duration sanity check: cannot be negative
  if (durationSeconds < 0) {
    return { valid: false, reason: 'Invalid game duration' };
  }

  switch (game) {
    case 'line98': {
      // Line 98: clearing 5 balls yields 50 points, 6 balls yields 80 points,
      // and intersecting lines (combos) can yield 150-300+ points in a single move.
      if (score > 100 && durationSeconds < 3) {
        return { valid: false, reason: 'Duration too short for Line 98 score' };
      }
      if (score > 500 && durationSeconds < 10) {
        return { valid: false, reason: 'Duration too short for Line 98 score' };
      }
      if (durationSeconds > 0 && score / durationSeconds > 100) {
        return { valid: false, reason: 'Rate of score exceeds maximum realistic threshold' };
      }
      // Check move count if provided
      if (typeof extraData.moveCount === 'number') {
        if (score > 200 && extraData.moveCount < 2) {
          return { valid: false, reason: 'Move count is too low for reported score' };
        }
        if (extraData.moveCount > 0 && score / extraData.moveCount > 180) {
          return { valid: false, reason: 'Average points per move is impossible' };
        }
      }
      return { valid: true };
    }

    case 'pikachu': {
      // Pikachu: Endless mode allows very high scores, but rate of score is constrained
      // by board size (48 pairs per board) and animations (~30-60s per board).
      if (score > 2000 && durationSeconds < 10) {
        return { valid: false, reason: 'Duration too short for Pikachu score' };
      }
      // Rate of score maximum ~600 pts/sec (accommodates fast pair clearing + remaining time bonus)
      if (durationSeconds > 0 && score / durationSeconds > 600) {
        return { valid: false, reason: 'Rate of score exceeds maximum realistic threshold for Pikachu' };
      }
      // Single board (Level 1) cannot yield more than ~25,000 points
      if (extraData.level !== undefined && Number(extraData.level) <= 1 && score > 25000) {
        return { valid: false, reason: 'Level 1 score exceeds maximum possible board points' };
      }
      // High score (> 100,000) requires at least ~90 seconds of gameplay
      if (score > 100000 && durationSeconds < 90) {
        return { valid: false, reason: 'High score requires longer progression duration' };
      }
      return { valid: true };
    }

    case '2048': {
      // Rate of merge in 2048: max ~300-350 pts/sec with rapid keystrokes
      if (score > 1000 && durationSeconds < 5) {
        return { valid: false, reason: 'Duration too short for 2048 score' };
      }
      if (durationSeconds > 0 && score / durationSeconds > 350) {
        return { valid: false, reason: 'Rate of score exceeds maximum realistic threshold for 2048' };
      }
      if (extraData.highestTile) {
        const tile = Number(extraData.highestTile);
        if (score > 20000 && tile < 1024) {
          return { valid: false, reason: 'Tile size does not match score progression' };
        }
      }
      return { valid: true };
    }

    case 'flappybird': {
      // Flappy Bird: pipes spawn roughly every 1.2 to 1.5 seconds.
      // Score can never increase faster than 1 point per 0.8 seconds.
      if (score > 5) {
        const minDuration = score * 0.8 - 2;
        if (durationSeconds < minDuration) {
          return { valid: false, reason: 'Flappy Bird score rate physically impossible' };
        }
      }
      // Maximum duration check: Flappy Bird scrolls continuously without pause.
      // A pipe passes every ~1.2 - 2.0 seconds. It is impossible to achieve score X while taking > 3.5s per pipe.
      // This directly prevents "Idle Session Spoofing" (stashing a token for minutes before faking a small score).
      if (score > 5) {
        const maxDuration = score * 3.5 + 45;
        if (durationSeconds > maxDuration) {
          return { valid: false, reason: 'Game duration exceeds realistic time for Flappy Bird score (idle session detected)' };
        }
      }
      if (score > 5000) {
        return { valid: false, reason: 'Flappy Bird score exceeds threshold' };
      }
      return { valid: true };
    }

    case 'trex': {
      // T-Rex: points increase by distance/time, roughly 10-15 pts per second.
      // Maximum 25 pts/sec under highest speeds.
      if (score > 15) {
        const minDuration = Math.max(0.5, score / 25 - 1.5);
        if (durationSeconds < minDuration) {
          return { valid: false, reason: 'T-Rex score rate physically impossible' };
        }
      }
      if (score > 40) {
        // At slowest initial speed, T-Rex earns at least 5-8 pts/sec.
        // If a player claims 150 points after 600s, an idle session cheat is detected.
        const maxDuration = (score / 4) + 60;
        if (durationSeconds > maxDuration) {
          return { valid: false, reason: 'Game duration exceeds realistic time for T-Rex score (idle session detected)' };
        }
      }
      if (score > 50000) {
        return { valid: false, reason: 'T-Rex score exceeds threshold' };
      }
      return { valid: true };
    }

    case 'neonsnake': {
      // Each food in Neon Snake gives 10 points. 20x20 grid has 400 tiles max.
      if (score > 4000) {
        return { valid: false, reason: 'Neon Snake score exceeds grid maximum threshold' };
      }
      if (score > 20) {
        // Snake moves at ~100-150ms per step, takes at least ~0.5s per food on 20x20 grid
        const minDuration = (score / 10) * 0.5 - 1;
        if (durationSeconds < minDuration) {
          return { valid: false, reason: 'Neon Snake score rate physically impossible' };
        }
        // Idle session check: snake moves continuously without stopping.
        const maxDuration = (score / 10) * 15 + 60;
        if (durationSeconds > maxDuration) {
          return { valid: false, reason: 'Game duration exceeds realistic time for Neon Snake score (idle session detected)' };
        }
      }
      return { valid: true };
    }

    case 'blockdrop': {
      if (score > 1000000) {
        return { valid: false, reason: 'Block Drop score exceeds realistic threshold' };
      }
      if (score > 500) {
        const minDuration = (score / 1500) * 0.5;
        if (durationSeconds < minDuration) {
          return { valid: false, reason: 'Block Drop score rate physically impossible' };
        }
      }
      return { valid: true };
    }

    case 'aimtrainer': {
      // Aim Trainer is a fixed 60-second challenge
      if (durationSeconds < 15) {
        return { valid: false, reason: 'Aim Trainer challenge ended too quickly' };
      }
      if (durationSeconds > 75) {
        return { valid: false, reason: 'Aim Trainer challenge duration exceeded fixed time limit' };
      }
      if (score > 150) {
        return { valid: false, reason: 'Aim Trainer score exceeds human limit' };
      }
      if (extraData.accuracy !== undefined) {
        const acc = Number(extraData.accuracy);
        if (acc < 0 || acc > 100) {
          return { valid: false, reason: 'Accuracy must be between 0 and 100%' };
        }
      }
      return { valid: true };
    }

    case 'wordle': {
      if (durationSeconds < 3) {
        return { valid: false, reason: 'Wordle solved suspiciously fast' };
      }
      if (extraData.guessesCount !== undefined) {
        const g = Number(extraData.guessesCount);
        if (g < 1 || g > 6) {
          return { valid: false, reason: 'Invalid Wordle guesses count' };
        }
      }
      return { valid: true };
    }

    case 'minesweeper': {
      // For minesweeper, score in PATCH /score is `time` in seconds (lower is better)
      const time = score;
      const difficulty = extraData.difficulty || 'beginner';
      if (difficulty === 'beginner' && time < 1.5) {
        return { valid: false, reason: 'Minesweeper Beginner time is humanly impossible (< 1.5s)' };
      }
      if (difficulty === 'intermediate' && time < 8.0) {
        return { valid: false, reason: 'Minesweeper Intermediate time is humanly impossible (< 8s)' };
      }
      if (difficulty === 'expert' && time < 25.0) {
        return { valid: false, reason: 'Minesweeper Expert time is humanly impossible (< 25s)' };
      }
      // Allow up to 4 hours (14,400s) for expert, large, or carefully played boards
      if (time > 14400) {
        return { valid: false, reason: 'Minesweeper time exceeds maximum threshold' };
      }
      return { valid: true };
    }

    case 'sudoku': {
      // For sudoku, score in PATCH /score is `time` in seconds
      const time = score;
      const difficulty = extraData.difficulty || 'easy';
      if (difficulty === 'easy' && time < 15) {
        return { valid: false, reason: 'Sudoku Easy time is humanly impossible (< 15s)' };
      }
      if (difficulty === 'medium' && time < 30) {
        return { valid: false, reason: 'Sudoku Medium time is humanly impossible (< 30s)' };
      }
      if (difficulty === 'hard' && time < 60) {
        return { valid: false, reason: 'Sudoku Hard time is humanly impossible (< 60s)' };
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

/**
 * Action Log & Human Timing Verification.
 *
 * Verifies that the submitted move history:
 * 1. Matches actual session start and end times.
 * 2. Has natural human delays between moves (not instantaneous or inhuman).
 * 3. Does not exhibit mechanical bot uniformity (e.g. fixed interval bot scripts).
 * 4. Contains valid coordinates.
 */
export function validateActionLog(
  game: string,
  score: number,
  actionLog: any[],
  sessionStartTime: number,
  sessionEndTime: number
): GameValidationResult {
  if (!Array.isArray(actionLog)) {
    return { valid: false, reason: 'Action log must be an array' };
  }

  // Scores > 200 in Line 98 require move history evidence
  if (game === 'line98' && score > 200 && actionLog.length < 2) {
    return { valid: false, reason: 'Action log proof-of-play missing for high score' };
  }

  // Flappy Bird proof-of-play action log verification
  if (game === 'flappybird') {
    if (score > 5 && actionLog.length === 0) {
      return { valid: false, reason: 'Action log proof-of-play missing for Flappy Bird score' };
    }

    const pipes = actionLog.filter((a) => a && a.type === 'pipe');
    const flaps = actionLog.filter((a) => a && a.type === 'flap');

    // Number of cleared pipe events must match reported score
    if (score > 0 && pipes.length !== score) {
      return {
        valid: false,
        reason: `Action log pipe count (${pipes.length}) does not match reported score (${score})`,
      };
    }

    // Flappy Bird requires frequent flapping due to gravity (1480 px/s^2).
    // For score > 5, having fewer than score * 0.8 flaps is physically impossible.
    if (score > 5 && flaps.length < Math.floor(score * 0.8)) {
      return {
        valid: false,
        reason: 'Flappy Bird flap count physically insufficient to sustain flight',
      };
    }

    // Pipe timing intervals check
    if (pipes.length >= 2) {
      for (let p = 1; p < pipes.length; p++) {
        const interval = pipes[p].t - pipes[p - 1].t;
        // Pipes spawn every ~1.1 to 1.5 seconds. Faster than 900ms is physically impossible.
        if (interval < 900) {
          return { valid: false, reason: 'Pipes passed suspiciously fast' };
        }
        // Slower than 3500ms per pipe is impossible as pipes move continuously without pause.
        if (interval > 3500) {
          return { valid: false, reason: 'Pipe intervals exceed continuous game scroll speed' };
        }
      }
    }

    // Bot detection for flap timing
    if (flaps.length >= 8) {
      const flapIntervals: number[] = [];
      for (let f = 1; f < flaps.length; f++) {
        flapIntervals.push(flaps[f].t - flaps[f - 1].t);
      }
      const mean = flapIntervals.reduce((a, b) => a + b, 0) / flapIntervals.length;
      const variance =
        flapIntervals.reduce((acc, dt) => acc + Math.pow(dt - mean, 2), 0) /
        flapIntervals.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 20) {
        return { valid: false, reason: 'Inhuman uniform flap timing detected (bot script)' };
      }
    }

    return { valid: true };
  }

  if (actionLog.length === 0) {
    return { valid: true };
  }

  let prevTime = sessionStartTime;
  const intervals: number[] = [];

  for (let i = 0; i < actionLog.length; i++) {
    const action = actionLog[i];
    if (!action || typeof action.t !== 'number') {
      return { valid: false, reason: `Malformed action log entry at step ${i}` };
    }

    // Must be after session start (allow up to 2000ms clock skew/grace)
    if (action.t < sessionStartTime - 2000) {
      return { valid: false, reason: 'Action occurred before game session was officially created' };
    }

    // Must not be in the future beyond server current time (allow 3000ms network jitter)
    if (action.t > sessionEndTime + 3000) {
      return { valid: false, reason: 'Action timestamp is in the future' };
    }

    // Must be non-decreasing in time
    if (i > 0 && action.t < prevTime) {
      return { valid: false, reason: 'Action timestamps must be strictly chronological' };
    }

    if (i > 0) {
      intervals.push(action.t - prevTime);
    }
    prevTime = action.t;

    // Coordinate validations for grid games
    if (game === 'line98') {
      if (!action.from || !action.to) {
        return { valid: false, reason: 'Move missing from/to coordinates' };
      }
      const { r: fr, c: fc } = action.from;
      const { r: tr, c: tc } = action.to;
      if (
        typeof fr !== 'number' || fr < 0 || fr > 8 ||
        typeof fc !== 'number' || fc < 0 || fc > 8 ||
        typeof tr !== 'number' || tr < 0 || tr > 8 ||
        typeof tc !== 'number' || tc < 0 || tc > 8
      ) {
        return { valid: false, reason: 'Move coordinates out of bounds (0-8)' };
      }
      if (fr === tr && fc === tc) {
        return { valid: false, reason: 'Invalid move: Source and destination are identical' };
      }
    }
  }

  // Statistical Human Delay & Bot Detection Analysis (applicable when enough moves exist)
  if (intervals.length >= 4) {
    // 1. Inhuman mechanical speed: Line 98 path animation alone takes 200ms+
    const tooFastCount = intervals.filter((dt) => dt < 150).length;
    if (tooFastCount / intervals.length > 0.35) {
      return { valid: false, reason: 'Inhuman reaction speed detected in moves' };
    }

    // 2. Uniform bot timing: Bots written with setInterval have identical intervals
    if (intervals.length >= 8) {
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((acc, dt) => acc + Math.pow(dt - mean, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      // Real humans have delay variance > 30ms. If stdDev is < 25ms across 8+ moves, it's a fixed-delay script!
      if (stdDev < 25) {
        return { valid: false, reason: 'Suspiciously uniform move timing detected (automated script)' };
      }
    }
  }

  return { valid: true };
}
