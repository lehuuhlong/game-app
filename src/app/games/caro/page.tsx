import { GameCaro } from "@/games/caro";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Caro (Gomoku) — Game Portal",
  description:
    "Play Caro / Gomoku — the classic 5-in-a-row strategy game. Challenge a friend locally on a 15×15 board!",
};

export default function CaroPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <GameCaro />
    </div>
  );
}
