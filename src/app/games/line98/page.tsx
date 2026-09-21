import { GameLine98 } from "@/games/line98";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Line 98 (Color Lines) — Game Portal",
  description:
    "Play classic Line 98 / Color Lines puzzle game. Align 5+ same-color balls to score with combos and length bonuses!",
};

export default function Line98Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <GameLine98 />
    </main>
  );
}
