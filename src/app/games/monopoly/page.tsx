import { GameMonopoly } from "@/games/monopoly";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monopoly — Game Portal",
  description:
    "The classic property trading game. Buy, sell, and trade properties to bankrupt your opponents in this real-time multiplayer board game.",
};

export default function MonopolyPage() {
  return (
    <div className="mx-auto max-w-7xl px-2 py-4 sm:py-8">
      <GameMonopoly />
    </div>
  );
}
