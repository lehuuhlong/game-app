import { GameNeonSnake } from "@/games/neonsnake";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neon Snake — Cyberpunk Arcade | Game Portal",
  description:
    "Extreme-performance Cyberpunk Neon Snake game. Glide across a high-speed 20x20 grid, absorb glowing energy cells, and beat the global arcade record.",
  openGraph: {
    title: "Neon Snake — Cyberpunk Arcade",
    description: "High-octane Cyberpunk Neon Snake game optimized for peak performance.",
    type: "website",
  },
};

export default function NeonSnakePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <GameNeonSnake />
    </div>
  );
}
