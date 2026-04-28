import { GameMinesweeper } from "@/games/minesweeper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Minesweeper — Game Portal",
  description:
    "Play the classic Minesweeper puzzle. Reveal cells, flag mines, and clear the board!",
};

export default function MinesweeperPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <GameMinesweeper />
    </div>
  );
}
