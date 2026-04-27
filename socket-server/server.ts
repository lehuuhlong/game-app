import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import { registerSocketHandlers } from "./handlers";

const app = express();
const port = parseInt(process.env.PORT || "4000", 10);

// ── CORS ────────────────────────────────────────────────────────────
// Allow the Vercel frontend + local dev
const ALLOWED_ORIGINS = [
  process.env.CLIENT_ORIGIN || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// Health check — Railway uses this to verify the service is alive
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Socket.io ────────────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

registerSocketHandlers(io as any);

// ── Start ────────────────────────────────────────────────────────────
httpServer.listen(port, () => {
  console.log(`\n🔌 Socket.io server running on port ${port}`);
  console.log(`   Allowed origins: ${ALLOWED_ORIGINS.join(", ")}\n`);
});
