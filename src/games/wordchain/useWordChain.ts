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

export function useWordChain(userId?: string) {
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
  const matchSavedRef = useRef(false);
  const matchSubmittedToApiRef = useRef(false);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playersRef = useRef<WordChainPlayer[]>([]);
  const usernameRef = useRef("");
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

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

  // ── Socket connection ───────────────────────────────────────────

  const getSocket = useCallback((): Socket => {
    if (!socketRef.current) {
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
        .off("match_saved" as any)
        .off("error");

      // ── Room joined ──────────────────────────────────────────
      socket.on("room_joined", ({ room, playerId }: any) => {
        myPlayerIdRef.current = playerId;
        const mappedPlayers = room.players.map((p: any) => ({
          id: p.id,
          username: p.username,
          userId: p.userId,
        }));
        setPlayers(mappedPlayers);
        playersRef.current = mappedPlayers;
        setStatusMsg(
          room.players.length < 2
            ? "Waiting for opponent..."
            : "2/2 players connected"
        );
        setScreen("waiting");
      });

      // ── Another player joined ─────────────────────────────────
      socket.on("player_joined", ({ room }: any) => {
        const mappedPlayers = room.players.map((p: any) => ({
          id: p.id,
          username: p.username,
          userId: p.userId,
        }));
        setPlayers(mappedPlayers);
        playersRef.current = mappedPlayers;
        setStatusMsg("2/2 players connected — starting soon!");
      });

      // ── Player left ───────────────────────────────────────────
      socket.on("player_left", ({ room }: any) => {
        const mappedPlayers = room.players.map((p: any) => ({
          id: p.id,
          username: p.username,
          userId: p.userId,
        }));
        setPlayers(mappedPlayers);
        playersRef.current = mappedPlayers;
        if (screenRef.current === "playing") {
          // Game ends — handled by wc_game_over from server
        } else {
          setStatusMsg("Opponent left. Waiting for another player...");
        }
      });

      // ── Game started ──────────────────────────────────────────
      socket.on("wc_game_started", ({ room, gameState }: any) => {
        const mappedPlayers = room.players.map((p: any) => ({
          id: p.id,
          username: p.username,
          userId: p.userId,
        }));
        setPlayers(mappedPlayers);
        playersRef.current = mappedPlayers;
        setChain([]);
        setCurrentTurnPlayerId(gameState.currentTurnPlayerId);
        setGameLanguage(gameState.language);
        setWordInput("");
        setRejectMsg("");
        setWinnerMsg("");
        setIsSubmitting(false);
        matchSavedRef.current = false;
        matchSubmittedToApiRef.current = false;
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
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
        
        if (data.reason === "disconnect") {
          setWinnerMsg(win ? "🏃 Opponent left the match — You win!" : "🚪 You left the match");
        } else if (data.reason === "timeout") {
          setWinnerMsg(win ? "⌛ Opponent timed out — You win!" : "⌛ Turn time expired — You lose!");
        } else if (data.reason === "invalid_word") {
          setWinnerMsg(win ? "❌ Opponent used invalid word — You win!" : "❌ Invalid word — You lose!");
        } else {
          setWinnerMsg(win ? "🏆 You win!" : "😔 You lose!");
        }

        setChain(data.gameState.chain);
        setScreen("finished");

        // Record 1v1 match
        try {
          if (!matchSavedRef.current && data.winnerName && data.loserName) {
            const submitMatch = () => {
              if (matchSubmittedToApiRef.current) return;
              matchSubmittedToApiRef.current = true;
              matchSavedRef.current = true;

              const winPlayer = playersRef.current.find((p) => p.username === data.winnerName);
              const losePlayer = playersRef.current.find((p) => p.username === data.loserName);
              const winUserId = (winPlayer as any)?.userId || (data.winnerName === usernameRef.current ? userIdRef.current : undefined);
              const loseUserId = (losePlayer as any)?.userId || (data.loserName === usernameRef.current ? userIdRef.current : undefined);

              fetch("/api/matches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  gameType: "wordchain",
                  players: [
                    { username: data.winnerName, result: "win", score: 1, userId: winUserId },
                    { username: data.loserName, result: "loss", score: 0, userId: loseUserId },
                  ],
                  duration: 0,
                  gameData: {
                    roomId: roomIdRef.current,
                    wordsCount: data.gameState?.chain?.length || 0,
                    reason: data.reason,
                    language: data.gameState?.language || "en",
                  },
                }),
              })
                .then((r) => r.json())
                .then((resData) => {
                  if (resData && resData.users && Array.isArray(resData.users)) {
                    socketRef.current?.emit("match_saved" as any, {
                      roomId: roomIdRef.current,
                      users: resData.users,
                    });
                    try {
                      const stored = localStorage.getItem("game-portal-user");
                      if (stored) {
                        const u = JSON.parse(stored);
                        const updated = resData.users.find(
                          (x: any) =>
                            (u.id && x.id === u.id) ||
                            (u._id && x._id === u._id) ||
                            (x.username && x.username.toLowerCase() === u.username?.toLowerCase())
                        );
                        if (updated) {
                          Object.assign(u, updated);
                          localStorage.setItem("game-portal-user", JSON.stringify(u));
                          if (typeof window !== "undefined") {
                            window.dispatchEvent(new CustomEvent("userProfileUpdated"));
                          }
                        }
                      }
                    } catch {}
                  }
                })
                .catch(() => {});
            };

            if (win) {
              submitMatch();
            } else {
              if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
              fallbackTimerRef.current = setTimeout(() => {
                submitMatch();
              }, 6000);
            }
          }
        } catch {
          // ignore
        }
      });

      // ── Match Saved via Socket ────────────────────────────────
      socket.on("match_saved" as any, ({ users }: { users: any[] }) => {
        matchSavedRef.current = true;
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        try {
          const stored = localStorage.getItem("game-portal-user");
          if (stored && users && Array.isArray(users)) {
            const u = JSON.parse(stored);
            const updated = users.find(
              (x: any) =>
                (u.id && x.id === u.id) ||
                (u._id && x._id === u._id) ||
                (x.username && x.username.toLowerCase() === u.username?.toLowerCase())
            );
            if (updated) {
              Object.assign(u, updated);
              localStorage.setItem("game-portal-user", JSON.stringify(u));
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("userProfileUpdated"));
              }
            }
          }
        } catch {}
      });

      // ── Room Expired ─────────────────────────────────────────
      socket.on("room_expired", ({ message }: any) => {
        stopTimer();
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        matchSavedRef.current = false;
        matchSubmittedToApiRef.current = false;
        setJoinError(message || "Room expired: Game was not started within 3 minutes.");
        setScreen("lobby");
        roomIdRef.current = "";
        myPlayerIdRef.current = "";
        setRoomId("");
        setPlayers([]);
        playersRef.current = [];
      });

      // ── Error ─────────────────────────────────────────────────
      socket.on("error", ({ message }: any) => {
        setJoinError(message);
      });
    },
    [setScreen, startTimer, stopTimer]
  );

  // ── Room actions ───────────────────────────────────────────────

  const createRoom = useCallback(
    (username: string) => {
      const socket = getSocket();
      const id = Math.random().toString(36).slice(2, 8).toUpperCase();
      roomIdRef.current = id;
      usernameRef.current = username;
      setRoomId(id);
      setJoinError("");
      setupSocket(socket);
      socket.emit("join_room", {
        roomId: id,
        gameType: "wordchain",
        username,
        userId: userIdRef.current,
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
      usernameRef.current = username;
      setRoomId(id);
      setJoinError("");
      setupSocket(socket);
      socket.emit("join_room", {
        roomId: id,
        gameType: "wordchain",
        username,
        userId: userIdRef.current,
        action: "join",
        language,
      });
    },
    [getSocket, setupSocket, joinInput, language]
  );

  const leaveRoom = useCallback(() => {
    stopTimer();
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    matchSavedRef.current = false;
    matchSubmittedToApiRef.current = false;
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
    playersRef.current = [];
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
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    matchSavedRef.current = false;
    matchSubmittedToApiRef.current = false;
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
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
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
