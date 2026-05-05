/**
 * useWordChain — custom hook for the Word Chain (Nối Từ) game.
 *
 * Manages:
 *  - Socket.io connection to the Word Chain room
 *  - Lobby / waiting / playing / finished screen transitions
 *  - Client-side countdown timer (synced with server-authoritative timer)
 *  - Word submission, rejection feedback, and chain state
 *  - Language selection (English / Vietnamese)
 *
 * Validation is handled server-side (Free Dictionary API for EN,
 * mock word list for VI). This hook only sends words and reacts
 * to server events.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  WordChainLanguage,
  WordChainEntry,
  WordChainGameState,
  WordChainScreen,
  WordChainPlayer,
} from "./types";

const TURN_DURATION = 20; // seconds — matches server

// ── Hook ──────────────────────────────────────────────────────────

export function useWordChain() {
  // ── Screen state ────────────────────────────────────────────────
  const [screen, _setScreen] = useState<WordChainScreen>("lobby");
  const screenRef = useRef<WordChainScreen>("lobby");
  const setScreen = useCallback((s: WordChainScreen) => {
    screenRef.current = s;
    _setScreen(s);
  }, []);

  // ── Lobby state ─────────────────────────────────────────────────
  const [language, setLanguage] = useState<WordChainLanguage>("en");
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [roomId, setRoomId] = useState("");
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Waiting for opponent...");

  // ── Game state ──────────────────────────────────────────────────
  const [chain, setChain] = useState<WordChainEntry[]>([]);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState("");
  const [players, setPlayers] = useState<WordChainPlayer[]>([]);
  const [gameLanguage, setGameLanguage] = useState<WordChainLanguage>("en");

  // ── Input & feedback ────────────────────────────────────────────
  const [wordInput, setWordInput] = useState("");
  const [rejectMsg, setRejectMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Timer ───────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Result ──────────────────────────────────────────────────────
  const [winnerMsg, setWinnerMsg] = useState<string>("");
  const [didIWin, setDidIWin] = useState(false);

  // ── Refs for socket & identity ──────────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const roomIdRef = useRef("");
  const myPlayerIdRef = useRef("");

  // ── Timer helpers ───────────────────────────────────────────────

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(TURN_DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          // Notify server of timeout (server also has its own timer)
          socketRef.current?.emit("wc_timeout", {
            roomId: roomIdRef.current,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  const saveWordchain = useCallback((won: boolean) => {
    try {
      const stored = localStorage.getItem("game-portal-user");
      if (!stored) return;
      const u = JSON.parse(stored);
      if (!u?.id) return;
      fetch(`/api/users/${u.id}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "wordchain", won }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.wordchainWins !== undefined) {
            u.wordchainWins = d.wordchainWins;
            u.wordchainTotal = d.wordchainTotal;
            localStorage.setItem("game-portal-user", JSON.stringify(u));
          }
        })
        .catch(() => {});
    } catch { /* ignore */ }
  }, []);

  // ── Socket connection ───────────────────────────────────────────

  const getSocket = useCallback((): Socket => {
    if (!socketRef.current || !socketRef.current.connected) {
      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
      socketRef.current = io(socketUrl, {
        transports: ["websocket", "polling"],
      });
    }
    return socketRef.current;
  }, []);

  // ── Socket event handlers ──────────────────────────────────────

  const setupSocket = useCallback(
    (socket: Socket) => {
      // Clear previous listeners
      socket
        .off("room_joined")
        .off("player_joined")
        .off("player_left")
        .off("wc_game_started")
        .off("wc_word_accepted")
        .off("wc_word_rejected")
        .off("wc_turn_changed")
        .off("wc_game_over")
        .off("error");

      // ── Room joined ──────────────────────────────────────────
      socket.on("room_joined", ({ room, playerId }: any) => {
        myPlayerIdRef.current = playerId;
        setPlayers(
          room.players.map((p: any) => ({
            id: p.id,
            username: p.username,
          }))
        );
        setStatusMsg(
          room.players.length < 2
            ? "Waiting for opponent..."
            : "2/2 players connected"
        );
        setScreen("waiting");
      });

      // ── Another player joined ─────────────────────────────────
      socket.on("player_joined", ({ room }: any) => {
        setPlayers(
          room.players.map((p: any) => ({
            id: p.id,
            username: p.username,
          }))
        );
        setStatusMsg("2/2 players connected — starting soon!");
      });

      // ── Player left ───────────────────────────────────────────
      socket.on("player_left", ({ room }: any) => {
        setPlayers(
          room.players.map((p: any) => ({
            id: p.id,
            username: p.username,
          }))
        );
        if (screenRef.current === "playing") {
          // Game ends — handled by wc_game_over from server
        } else {
          setStatusMsg("Opponent left. Waiting for another player...");
        }
      });

      // ── Game started ──────────────────────────────────────────
      socket.on("wc_game_started", ({ room, gameState }: any) => {
        setPlayers(
          room.players.map((p: any) => ({
            id: p.id,
            username: p.username,
          }))
        );
        setChain([]);
        setCurrentTurnPlayerId(gameState.currentTurnPlayerId);
        setGameLanguage(gameState.language);
        setWordInput("");
        setRejectMsg("");
        setWinnerMsg("");
        setIsSubmitting(false);
        setScreen("playing");
        // Timer starts visually when the first word is submitted
        setTimeLeft(20);
        stopTimer();
      });

      // ── Word accepted ─────────────────────────────────────────
      socket.on("wc_word_accepted", ({ entry, gameState }: any) => {
        setChain(gameState.chain);
        setIsSubmitting(false);
        setRejectMsg("");
        setWordInput("");
      });

      // ── Word rejected ─────────────────────────────────────────
      socket.on("wc_word_rejected", ({ reason }: any) => {
        setRejectMsg(reason);
        setIsSubmitting(false);
      });

      // ── Turn changed ──────────────────────────────────────────
      socket.on("wc_turn_changed", ({ currentTurnPlayerId: nextId }: any) => {
        setCurrentTurnPlayerId(nextId);
        startTimer(); // Reset countdown
      });

      // ── Game over ─────────────────────────────────────────────
      socket.on("wc_game_over", (data: any) => {
        stopTimer();
        const win = data.winnerId === myPlayerIdRef.current;
        setDidIWin(win);
        
        const suffix = data.reason === "timeout" ? " (Time out)" : "";
        if (data.reason === "disconnect") {
          setWinnerMsg("🏃 Opponent left — you win!");
        } else {
          setWinnerMsg(win ? `🏆 You win${suffix}!` : `😔 You lose${suffix}`);
        }

        setChain(data.gameState.chain);
        setScreen("finished");
        saveWordchain(win);
      });

      // ── Error ─────────────────────────────────────────────────
      socket.on("error", ({ message }: any) => {
        setJoinError(message);
      });
    },
    [setScreen, startTimer, stopTimer, saveWordchain]
  );

  // ── Room actions ───────────────────────────────────────────────

  const createRoom = useCallback(
    (username: string) => {
      const socket = getSocket();
      const id = Math.random().toString(36).slice(2, 8).toUpperCase();
      roomIdRef.current = id;
      setRoomId(id);
      setJoinError("");
      setupSocket(socket);
      socket.emit("join_room", {
        roomId: id,
        gameType: "wordchain",
        username,
        action: "create",
        language,
      });
    },
    [getSocket, setupSocket, language]
  );

  const joinRoom = useCallback(
    (username: string, code?: string) => {
      const id = (code || joinInput).trim().toUpperCase();
      if (!id) {
        setJoinError("Please enter a room code.");
        return;
      }
      const socket = getSocket();
      roomIdRef.current = id;
      setRoomId(id);
      setJoinError("");
      setupSocket(socket);
      socket.emit("join_room", {
        roomId: id,
        gameType: "wordchain",
        username,
        action: "join",
        language,
      });
    },
    [getSocket, setupSocket, joinInput, language]
  );

  const leaveRoom = useCallback(() => {
    if (screenRef.current === "playing") {
      saveWordchain(false);
    }
    stopTimer();
    socketRef.current?.emit("leave_room", { roomId: roomIdRef.current });
    socketRef.current?.disconnect();
    socketRef.current = null;
    roomIdRef.current = "";
    myPlayerIdRef.current = "";

    // Reset all state
    setScreen("lobby");
    setChain([]);
    setCurrentTurnPlayerId("");
    setPlayers([]);
    setRoomId("");
    setWordInput("");
    setRejectMsg("");
    setWinnerMsg("");
    setIsSubmitting(false);
    setJoinInput("");
    setJoinError("");
    setStatusMsg("Waiting for opponent...");
    setCopied(false);
  }, [stopTimer, setScreen]);

  const requestRematch = useCallback(() => {
    stopTimer();
    socketRef.current?.emit("restart_game", { roomId: roomIdRef.current });
    setChain([]);
    setWordInput("");
    setRejectMsg("");
    setWinnerMsg("");
    setIsSubmitting(false);
    setScreen("playing");
  }, [stopTimer, setScreen]);

  // ── Word submission ────────────────────────────────────────────

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
    [isSubmitting]
  );

  // ── Clipboard helper ──────────────────────────────────────────

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  // ── Computed values ────────────────────────────────────────────

  const isMyTurn = currentTurnPlayerId === myPlayerIdRef.current;
  const myPlayerId = myPlayerIdRef.current;

  // Get the required start for the next word
  const nextStartHint = chain.length > 0 ? chain[chain.length - 1].connector : null;

  const timerPercent = (timeLeft / TURN_DURATION) * 100;
  const timerColor =
    timeLeft <= 3 ? "bg-red-500" : timeLeft <= 6 ? "bg-amber-500" : "bg-green-500";

  // ── Cleanup on unmount ─────────────────────────────────────────

  useEffect(() => {
    return () => {
      // Note: We don't save loss on unmount here because if they just navigate away or close tab,
      // the server will emit game over to the OTHER player. The other player will get the win.
      // Explicitly leaving via button saves the loss right away.
      stopTimer();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [stopTimer]);

  return {
    // Screen
    screen,

    // Lobby
    language,
    setLanguage,
    joinInput,
    setJoinInput,
    joinError,
    roomId,
    copied,
    statusMsg,
    createRoom,
    joinRoom,
    copyRoomCode,

    // Game
    chain,
    currentTurnPlayerId,
    players,
    gameLanguage,
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

    // Actions
    leaveRoom,
    requestRematch,
  };
}
