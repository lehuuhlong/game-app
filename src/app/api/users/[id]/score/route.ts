/**
 * PATCH /api/users/[id]/score
 *
 * 2048:        only updates bestScore2048 if new score is higher.
 * Caro:        increments caroTotal, and caroWins if won=true.
 * Minesweeper: saves best time (lower is better) per difficulty level.
 * Wordle:      increments wordleWins on a win.
 *
 * Body (2048):        { game: "2048", score: number, highestTile?: number }
 * Body (caro):        { game: "caro", won: boolean }
 * Body (minesweeper): { game: "minesweeper", difficulty: "beginner"|"intermediate"|"expert", time: number }
 * Body (wordle):      { game: "wordle", won: boolean }
 * Body (sudoku):      { game: "sudoku", difficulty: "easy"|"medium"|"hard", time: number }
 */

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const VALID_GAMES = ['2048', 'caro', 'minesweeper', 'wordle', 'trex', 'wordchain', 'sudoku', 'chess', 'aimtrainer', 'battleship', 'monopoly'];
const MS_FIELD_MAP: Record<string, 'msBestBeginner' | 'msBestIntermediate' | 'msBestExpert'> = {
  beginner: 'msBestBeginner',
  intermediate: 'msBestIntermediate',
  expert: 'msBestExpert',
};
const SUDOKU_FIELD_MAP: Record<string, 'sudokuBestEasy' | 'sudokuBestMedium' | 'sudokuBestHard'> = {
  easy: 'sudokuBestEasy',
  medium: 'sudokuBestMedium',
  hard: 'sudokuBestHard',
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { game } = body;

    if (!game || !VALID_GAMES.includes(game)) {
      return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (game === '2048') {
      const { score, highestTile } = body;
      if (typeof score !== 'number' || score < 0) {
        return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
      }
      if (score > user.bestScore2048) {
        user.bestScore2048 = score;
      }
      if (typeof highestTile === 'number' && highestTile > (user.highest2048Tile || 0)) {
        user.highest2048Tile = highestTile;
      }
    } else if (game === 'caro') {
      const { won } = body;
      user.caroTotal = (user.caroTotal || 0) + 1;
      if (won === true) user.caroWins = (user.caroWins || 0) + 1;
    } else if (game === 'minesweeper') {
      const { difficulty, time } = body;
      const field = MS_FIELD_MAP[difficulty];
      if (!field) {
        return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
      }
      if (typeof time !== 'number' || time <= 0) {
        return NextResponse.json({ error: 'Invalid time' }, { status: 400 });
      }
      // Only keep best (fastest) time — lower is better; 0 means no record yet
      const current = user[field] as number;
      if (current === 0 || time < current) {
        user[field] = time;
      }
    } else if (game === 'wordle') {
      const { won, guessesCount } = body;
      user.wordleTotal = (user.wordleTotal || 0) + 1;
      if (won === true) {
        user.wordleWins = (user.wordleWins || 0) + 1;
        if (typeof guessesCount === 'number' && guessesCount >= 1 && guessesCount <= 6) {
          const field = `wordleGuesses${guessesCount}` as
            | 'wordleGuesses1'
            | 'wordleGuesses2'
            | 'wordleGuesses3'
            | 'wordleGuesses4'
            | 'wordleGuesses5'
            | 'wordleGuesses6';
          user[field] = (user[field] || 0) + 1;
        }
      }
    } else if (game === 'trex') {
      const { score } = body;
      if (typeof score !== 'number' || score < 0) {
        return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
      }
      if (score > (user.bestScoreTrex || 0)) {
        user.bestScoreTrex = score;
      }
    } else if (game === 'wordchain') {
      const { won } = body;
      user.wordchainTotal = (user.wordchainTotal || 0) + 1;
      if (won === true) user.wordchainWins = (user.wordchainWins || 0) + 1;
    } else if (game === 'sudoku') {
      const { difficulty, time } = body;
      const field = SUDOKU_FIELD_MAP[difficulty];
      if (!field) {
        return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
      }
      if (typeof time !== 'number' || time <= 0) {
        return NextResponse.json({ error: 'Invalid time' }, { status: 400 });
      }
      const current = user[field] as number;
      if (current === 0 || time < current) {
        user[field] = time;
      }
    } else if (game === 'chess') {
      const { won } = body;
      user.chessTotal = (user.chessTotal || 0) + 1;
      if (won === true) {
        user.chessWins = (user.chessWins || 0) + 1;
      }
    } else if (game === 'aimtrainer') {
      const { score, accuracy } = body;
      if (typeof score !== 'number' || score < 0) {
        return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
      }
      if (score > (user.aimTrainerBestScore || 0)) {
        user.aimTrainerBestScore = score;
        if (typeof accuracy === 'number') {
          user.aimTrainerBestAccuracy = accuracy;
        }
      } else if (score === (user.aimTrainerBestScore || 0) && typeof accuracy === 'number') {
        if (accuracy > (user.aimTrainerBestAccuracy || 0)) {
          user.aimTrainerBestAccuracy = accuracy;
        }
      }
    } else if (game === 'battleship') {
      const { won } = body;
      user.battleshipTotal = (user.battleshipTotal || 0) + 1;
      if (won === true) {
        user.battleshipWins = (user.battleshipWins || 0) + 1;
      }
    } else if (game === 'monopoly') {
      const { won } = body;
      user.monopolyTotal = (user.monopolyTotal || 0) + 1;
      if (won === true) {
        user.monopolyWins = (user.monopolyWins || 0) + 1;
      }
    }

    await user.save();

    return NextResponse.json({
      bestScore2048: user.bestScore2048,
      highest2048Tile: user.highest2048Tile,
      caroWins: user.caroWins,
      caroTotal: user.caroTotal,
      msBestBeginner: user.msBestBeginner,
      msBestIntermediate: user.msBestIntermediate,
      msBestExpert: user.msBestExpert,
      wordleWins: user.wordleWins,
      wordleTotal: user.wordleTotal,
      wordleGuesses1: user.wordleGuesses1,
      wordleGuesses2: user.wordleGuesses2,
      wordleGuesses3: user.wordleGuesses3,
      wordleGuesses4: user.wordleGuesses4,
      wordleGuesses5: user.wordleGuesses5,
      wordleGuesses6: user.wordleGuesses6,
      bestScoreTrex: user.bestScoreTrex,
      wordchainWins: user.wordchainWins,
      wordchainTotal: user.wordchainTotal,
      sudokuBestEasy: user.sudokuBestEasy,
      sudokuBestMedium: user.sudokuBestMedium,
      sudokuBestHard: user.sudokuBestHard,
      chessWins: user.chessWins,
      chessTotal: user.chessTotal,
      aimTrainerBestScore: user.aimTrainerBestScore,
      aimTrainerBestAccuracy: user.aimTrainerBestAccuracy,
      battleshipWins: user.battleshipWins,
      battleshipTotal: user.battleshipTotal,
      monopolyWins: user.monopolyWins,
      monopolyTotal: user.monopolyTotal,
    });
  } catch (error) {
    console.error('PATCH /api/users/[id]/score error:', error);
    return NextResponse.json({ error: 'Failed to update score' }, { status: 500 });
  }
}
