"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import type { Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  WordChainGameState,
  WordChainLanguage,
  WordChainEntry,
} from "@/types/socket";
import type { WordChainPlayer } from "./types";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useGameTimer } from "@/hooks/useGameTimer";

const TURN_DURATION = 20;

export function useWordChain(username?: string) {
  const [language, setLanguage] = useState<WordChainLanguage>("en");
  const [gameLanguage, setGameLanguage] = useState<WordChainLanguage>("en");
  const [chain, setChain] = useState<WordChainEntry[]>([]);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string>("");
  const [wordInput, setWordInput] = useState<string>("");
  const [rejectMsg, setRejectMsg] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [winnerMsg, setWinnerMsg] = useState<string>("");
  const [didIWin, setDidIWin] = useState<boolean>(false);

  const languageRef = useRef<WordChainLanguage>(language);
  languageRef.current = language;

  const timer = useGameTimer({
    duration: TURN_DURATION,
    onTimeout: () => {
      socketRef.current?.emit("wc_timeout", {
        roomId: roomIdRef.current,
      });
    },
  });

  const { startTimer, stopTimer, timeLeft, percent: timerPercent, colorClass: timerColor } = timer;

  const setupWCSocket = useCallback(
    (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
      socket.off("wc_game_started");
      socket.off("wc_word_accepted");
      socket.off("wc_word_rejected");
      socket.off("wc_turn_changed");
      socket.off("wc_game_over");

      socket.on("wc_game_started", ({ room: r, gameState }: { room?: Room; gameState: WordChainGameState }) => {
        if (r) {
          gameSocket.setRoom(r);
          gameSocket.setPlayers(r.players);
        }
        setChain([]);
        setCurrentTurnPlayerId(gameState.currentTurnPlayerId);
        setGameLanguage(gameState.language);
        setWordInput("");
        setRejectMsg("");
        setWinnerMsg("");
        setIsSubmitting(false);
        setDidIWin(false);
        setScreen("playing");
        stopTimer();
      });

      socket.on("wc_word_accepted", ({ gameState }: { gameState: WordChainGameState }) => {
        setChain(gameState.chain);
        setIsSubmitting(false);
        setRejectMsg("");
        setWordInput("");
      });

      socket.on("wc_word_rejected", ({ reason }: { reason: string }) => {
        setRejectMsg(reason);
        setIsSubmitting(false);
      });

      socket.on(
        "wc_turn_changed",
        ({ currentTurnPlayerId: turnId }: { currentTurnPlayerId: string; turnStartedAt: number }) => {
          setCurrentTurnPlayerId(turnId);
          startTimer();
        }
      );

      socket.on(
        "wc_game_over",
        ({
          winnerId,
          winnerName,
          reason,
          gameState,
        }: {
          winnerId: string;
          winnerName: string;
          reason: string;
          gameState: WordChainGameState;
        }) => {
          stopTimer();
          setScreen("finished");
          const meWon = winnerId === playerIdRef.current;
          setDidIWin(meWon);

          let reasonDesc = "";
          if (reason === "timeout") {
            reasonDesc = meWon ? "Opponent ran out of time!" : "You ran out of time!";
          } else if (reason === "disconnect") {
            reasonDesc = meWon ? "Opponent disconnected!" : "You disconnected!";
          } else {
            reasonDesc = "Game Over!";
          }

          setWinnerMsg(`${winnerName} won! (${reasonDesc})`);

          if (meWon && gameState.chain.length > 0) {
            saveMatchResult({
              gameType: "wordchain",
              players: [
                { username: winnerName, result: "win", score: gameState.chain.length },
                {
                  username: username === winnerName ? "Opponent" : username || "Player",
                  result: "loss",
                  score: gameState.chain.length,
                },
              ],
              duration: 0,
              gameData: {
                language: gameState.language,
                wordsCount: gameState.chain.length,
                winnerName,
              },
            });
          }
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startTimer, stopTimer, username]
  );

  const gameSocket = useGameSocket({
    gameType: "wordchain",
    username: username || "",
    onSetupSocket: setupWCSocket,
  });

  const {
    socketRef,
    roomIdRef,
    playerIdRef,
    screen,
    setScreen,
    roomId,
    players,
    joinError,
    setJoinError,
    statusMsg,
    copied,
    createRoom: baseCreateRoom,
    joinRoom: baseJoinRoom,
    leaveRoom: baseLeaveRoom,
    requestRematch: baseRequestRematch,
    copyRoomCode,
    saveMatchResult,
  } = gameSocket;

  const createRoom = useCallback(() => {
    baseCreateRoom({ language: languageRef.current });
  }, [baseCreateRoom]);

  const joinRoom = useCallback(
    (code: string) => {
      baseJoinRoom(code, { language: languageRef.current });
    },
    [baseJoinRoom]
  );

  const leaveRoom = useCallback(() => {
    stopTimer();
    baseLeaveRoom();
    setChain([]);
    setWordInput("");
    setRejectMsg("");
    setWinnerMsg("");
    setIsSubmitting(false);
  }, [stopTimer, baseLeaveRoom]);

  const requestRematch = useCallback(() => {
    stopTimer();
    baseRequestRematch();
    setChain([]);
    setWordInput("");
    setRejectMsg("");
    setWinnerMsg("");
    setIsSubmitting(false);
    setScreen("playing");
  }, [stopTimer, baseRequestRematch, setScreen]);

  const submitWord = useCallback(
    (word: string) => {
      const trimmed = word.trim();
      if (!trimmed || isSubmitting) return;

      setRejectMsg("");
      setIsSubmitting(true);
      socketRef.current?.emit("wc_submit_word", {
        roomId: roomIdRef.current,
        word: trimmed,
      });
    },
    [isSubmitting, socketRef, roomIdRef]
  );

  const myPlayerId = gameSocket.playerId || "";
  const isMyTurn = useMemo(() => {
    return !!myPlayerId && currentTurnPlayerId === myPlayerId;
  }, [myPlayerId, currentTurnPlayerId]);

  const nextStartHint = useMemo(() => {
    return chain.length > 0 ? chain[chain.length - 1].connector : null;
  }, [chain]);

  return {
    screen,
    setScreen,
    language,
    setLanguage,
    gameLanguage,
    roomId,
    players: players as WordChainPlayer[],
    joinError,
    setJoinError,
    statusMsg,
    copied,
    copyRoomCode,
    createRoom,
    joinRoom,
    leaveRoom,
    requestRematch,

    // Game State
    chain,
    currentTurnPlayerId,
    isMyTurn,
    myPlayerId,
    nextStartHint,

    // Input
    wordInput,
    setWordInput,
    rejectMsg,
    isSubmitting,
    submitWord,

    // Timer
    timeLeft,
    timerPercent,
    timerColor,

    // Result
    winnerMsg,
    didIWin,
  };
}
