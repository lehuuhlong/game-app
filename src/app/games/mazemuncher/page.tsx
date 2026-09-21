import { GameMazeMuncher } from "@/games/mazemuncher";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maze Muncher — Game Portal",
  description:
    "A fast-paced grid-based arcade maze traversal game. Navigate the neon corridors and outsmart the Chasers!",
};

export default function MazeMuncherPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <GameMazeMuncher />
    </div>
  );
}
