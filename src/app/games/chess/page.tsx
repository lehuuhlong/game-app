import { GameChess } from "@/games/chess";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chess — Game Portal",
  description:
    "Play real-time multiplayer Chess online with friends. Standard rules, FEN synchronization, and turn timers.",
};

export default function ChessPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <GameChess />
    </div>
  );
}
