'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Cell, Point, LevelConfig } from './types';
import {
  LEVELS,
  BASE_MATCH_SCORE,
  TIME_BONUS_PER_MATCH,
  COMBO_WINDOW_MS,
  INITIAL_HINTS,
  INITIAL_SHUFFLES,
} from './constants';
import { findOnetPath, findAvailableMove } from './pathfinding';
import { generateBoard, shuffleBoard, applyGravity, copyBoard } from './boardGenerator';
import {
  playSelectSound,
  playMatchSound,
  playErrorSound,
  playShuffleSound,
  playHintSound,
  playLevelUpSound,
  playGameOverSound,
} from './sounds';

export type PikachuGameStatus = 'ready' | 'playing' | 'paused' | 'level_cleared' | 'game_over' | 'victory';

export function usePikachuLogic() {
  const [levelIdx, setLevelIdx] = useState(0);
  const currentConfig: LevelConfig = LEVELS[levelIdx] || LEVELS[0];

  const [board, setBoard] = useState<Cell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [activePath, setActivePath] = useState<Point[] | null>(null);

  const [score, setScore] = useState(0);
  const [pairsLeft, setPairsLeft] = useState(0);
  const [timeLeft, setTimeLeft] = useState(currentConfig.timeLimit);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(INITIAL_HINTS);
  const [shufflesLeft, setShufflesLeft] = useState(INITIAL_SHUFFLES);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<PikachuGameStatus>('ready');
  const [message, setMessage] = useState<string | null>(null);

  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((msg: string, duration = 2000) => {
    setMessage(msg);
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => setMessage(null), duration);
  }, []);

  // ── 1. Start / Reset Level ──────────────────────────────────────────
  const startLevel = useCallback(
    (targetLevelIdx: number, carryOverScore = 0) => {
      const idx = Math.max(0, Math.min(targetLevelIdx, LEVELS.length - 1));
      const config = LEVELS[idx];
      setLevelIdx(idx);

      const newBoard = generateBoard(config);
      setBoard(newBoard);
      setSelectedCell(null);
      setActivePath(null);
      setPairsLeft((config.rows * config.cols) / 2);
      setTimeLeft(config.timeLimit);
      setHintsLeft(INITIAL_HINTS);
      setShufflesLeft(INITIAL_SHUFFLES);
      setCombo(0);
      setScore(carryOverScore);
      setStatus('playing');
      showNotification(`Level ${config.level}: ${config.name}!`, 2500);
    },
    [showNotification]
  );

  // Initialize first level
  useEffect(() => {
    startLevel(0, 0);
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    };
  }, [startLevel]);

  // ── 2. Countdown Timer ──────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('game_over');
          playGameOverSound(isMuted);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, isMuted]);

  // ── 3. Reset Combo Timer on inactivity ──────────────────────────────
  const resetComboTimer = useCallback(() => {
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => {
      setCombo(0);
    }, COMBO_WINDOW_MS);
  }, []);

  // ── 4. Cell Click / Selection Logic ─────────────────────────────────
  const selectCell = useCallback(
    (cell: Cell) => {
      if (status !== 'playing' || activePath !== null) return;
      if (!cell.tile) return; // Cannot select empty cell

      // Clear previous hints
      setBoard((prev) =>
        prev.map((r) => r.map((c) => (c.isHinted ? { ...c, isHinted: false } : c)))
      );

      // If nothing was previously selected:
      if (!selectedCell) {
        setSelectedCell(cell);
        setBoard((prev) =>
          prev.map((r) =>
            r.map((c) => ({
              ...c,
              isSelected: c.r === cell.r && c.c === cell.c,
            }))
          )
        );
        playSelectSound(isMuted);
        return;
      }

      // If clicking the exact same cell -> deselect
      if (selectedCell.r === cell.r && selectedCell.c === cell.c) {
        setSelectedCell(null);
        setBoard((prev) =>
          prev.map((r) => r.map((c) => ({ ...c, isSelected: false })))
        );
        playSelectSound(isMuted);
        return;
      }

      // If types do NOT match:
      if (selectedCell.tile?.type !== cell.tile.type) {
        // Change selection to the newly clicked cell
        setSelectedCell(cell);
        setBoard((prev) =>
          prev.map((r) =>
            r.map((c) => ({
              ...c,
              isSelected: c.r === cell.r && c.c === cell.c,
            }))
          )
        );
        playSelectSound(isMuted);
        return;
      }

      // ── Both cells match in type! Check path: ───────────────────────
      const pathResult = findOnetPath(board, selectedCell, cell);

      if (!pathResult.valid) {
        playErrorSound(isMuted);
        // Switch selection to new cell
        setSelectedCell(cell);
        setBoard((prev) =>
          prev.map((r) =>
            r.map((c) => ({
              ...c,
              isSelected: c.r === cell.r && c.c === cell.c,
            }))
          )
        );
        return;
      }

      // ── Valid Match! ────────────────────────────────────────────────
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((prev) => Math.max(prev, nextCombo));
      resetComboTimer();
      playMatchSound(nextCombo, isMuted);

      // Calculate score with combo multiplier
      const comboMultiplier = 1 + (nextCombo - 1) * 0.25;
      const points = Math.round(BASE_MATCH_SCORE * comboMultiplier);
      setScore((s) => s + points);

      // Award time bonus
      setTimeLeft((t) => Math.min(t + TIME_BONUS_PER_MATCH, currentConfig.timeLimit));

      // Display path animation
      setActivePath(pathResult.path);

      // Mark cells as removing
      setBoard((prev) =>
        prev.map((r) =>
          r.map((c) => {
            const isTarget =
              (c.r === selectedCell.r && c.c === selectedCell.c) ||
              (c.r === cell.r && c.c === cell.c);
            return isTarget ? { ...c, isRemoving: true, isSelected: false } : c;
          })
        )
      );

      setSelectedCell(null);

      // After electrical burst (~300ms), remove tiles and apply gravity
      setTimeout(() => {
        setActivePath(null);

        setBoard((prevBoard) => {
          let updated = copyBoard(prevBoard);
          updated[selectedCell.r][selectedCell.c].tile = null;
          updated[selectedCell.r][selectedCell.c].isRemoving = false;
          updated[cell.r][cell.c].tile = null;
          updated[cell.r][cell.c].isRemoving = false;

          // Apply level-specific gravity
          if (currentConfig.gravity !== 'none') {
            updated = applyGravity(updated, currentConfig.gravity);
          }

          const remainingPairs = pairsLeft - 1;
          setPairsLeft(remainingPairs);

          if (remainingPairs <= 0) {
            // Level Cleared!
            playLevelUpSound(isMuted);
            // Award time bonus: 10 points per remaining second
            const timeBonus = timeLeft * 10;
            setScore((s) => s + timeBonus + 500);

            if (levelIdx + 1 < LEVELS.length) {
              setStatus('level_cleared');
            } else {
              setStatus('victory');
            }
          } else {
            // Check if moves are still possible
            const available = findAvailableMove(updated);
            if (!available) {
              // Auto-shuffle if locked
              showNotification('No moves left! Auto-shuffling board...', 2000);
              playShuffleSound(isMuted);
              updated = shuffleBoard(updated);
            }
          }

          return updated;
        });
      }, 300);
    },
    [
      status,
      activePath,
      selectedCell,
      board,
      combo,
      resetComboTimer,
      isMuted,
      currentConfig,
      pairsLeft,
      timeLeft,
      levelIdx,
      showNotification,
    ]
  );

  // ── 5. Use Hint ─────────────────────────────────────────────────────
  const useHint = useCallback(() => {
    if (status !== 'playing' || hintsLeft <= 0) return;

    const available = findAvailableMove(board);
    if (!available) {
      // If no moves, force shuffle
      showNotification('No available moves! Shuffling...', 1500);
      playShuffleSound(isMuted);
      setBoard((prev) => shuffleBoard(prev));
      return;
    }

    setHintsLeft((h) => h - 1);
    playHintSound(isMuted);

    const { p1, p2 } = available;
    setBoard((prev) =>
      prev.map((r) =>
        r.map((c) => ({
          ...c,
          isHinted: (c.r === p1.r && c.c === p1.c) || (c.r === p2.r && c.c === p2.c),
        }))
      )
    );

    // Auto clear hint after 3.5s
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
      setBoard((prev) =>
        prev.map((r) => r.map((c) => (c.isHinted ? { ...c, isHinted: false } : c)))
      );
    }, 3500);
  }, [status, hintsLeft, board, showNotification, isMuted]);

  // ── 6. Use Shuffle ──────────────────────────────────────────────────
  const useShuffle = useCallback(() => {
    if (status !== 'playing' || shufflesLeft <= 0) return;

    setShufflesLeft((s) => s - 1);
    playShuffleSound(isMuted);
    setSelectedCell(null);
    setBoard((prev) => shuffleBoard(prev));
    showNotification('Board reshuffled!', 1500);
  }, [status, shufflesLeft, isMuted, showNotification]);

  // ── 7. Pause / Resume / Mute Controls ───────────────────────────────
  const togglePause = useCallback(() => {
    setStatus((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const nextLevel = useCallback(() => {
    if (levelIdx + 1 < LEVELS.length) {
      startLevel(levelIdx + 1, score);
    }
  }, [levelIdx, score, startLevel]);

  const restartGame = useCallback(() => {
    startLevel(0, 0);
  }, [startLevel]);

  return {
    levelConfig: currentConfig,
    levelIdx,
    board,
    selectedCell,
    activePath,
    score,
    pairsLeft,
    timeLeft,
    combo,
    maxCombo,
    hintsLeft,
    shufflesLeft,
    isMuted,
    status,
    message,
    selectCell,
    useHint,
    useShuffle,
    togglePause,
    toggleMute,
    nextLevel,
    restartGame,
    startLevel,
  };
}
