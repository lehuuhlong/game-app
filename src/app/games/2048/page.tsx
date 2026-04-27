import { Game2048 } from "@/games/2048";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "2048 — Game Portal",
  description:
    "Play the classic 2048 puzzle game. Slide tiles, combine numbers, and reach 2048!",
};

export default function Game2048Page() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Game2048 />
    </div>
  );
}
