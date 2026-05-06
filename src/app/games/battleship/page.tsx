import { GameBattleship } from "@/games/battleship";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Battleship — Game Portal",
  description:
    "Engage in tactical naval combat. Place your fleet strategically and sink the enemy's ships in this real-time multiplayer classic.",
};

export default function BattleshipPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <GameBattleship />
    </div>
  );
}
