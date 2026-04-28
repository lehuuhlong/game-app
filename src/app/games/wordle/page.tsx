import { GameWordle } from "@/games/wordle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wordle — Game Portal",
  description:
    "Guess the 5-letter word in 6 tries. Each guess reveals color-coded clues!",
};

export default function WordlePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <GameWordle />
    </div>
  );
}
