import { GamePikachu } from "@/games/pikachu";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pikachu Connect (Onet Link) — Game Portal",
  description:
    "Play classic Pikachu Connect / Onet Link pair matching game. Connect identical pairs with at most 2 bends, unlock combos, and beat the clock!",
};

export default function PikachuPage() {
  return (
    <div className="w-full">
      <GamePikachu />
    </div>
  );
}
