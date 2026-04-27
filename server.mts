/**
 * Custom Node.js server for the Game Portal.
 *
 * This server wraps Next.js and attaches a Socket.io instance
 * to the same HTTP server. This is necessary because Next.js
 * serverless/edge functions do not support persistent WebSocket
 * connections — Socket.io requires a long-lived Node process.
 *
 * In production you would run: `npm run build && npm run start:custom`
 * In development: `npm run dev:custom`
 */

import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import * as socketHandlers from "./src/lib/socket/handlers";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // ── Socket.io Server ──────────────────────────────────────────
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    // Use WebSocket transport first for lower latency, fall back to polling
    transports: ["websocket", "polling"],
  });

  // Register all game-specific socket event handlers
  (socketHandlers as any).default.registerSocketHandlers(io);

  // ── Start ─────────────────────────────────────────────────────
  httpServer.listen(port, () => {
    console.log(
      `\n🎮 Game Portal is running at http://${hostname}:${port}\n` +
        `   Mode: ${dev ? "development" : "production"}\n` +
        `   Socket.io: attached ✓\n`
    );
  });
});
