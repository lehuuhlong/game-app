import { GameWordChain } from "@/games/wordchain";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Word Chain — Game Portal",
  description:
    "Test your vocabulary in this fast-paced multiplayer game. Chain words together before the 10-second timer runs out!",
};

export default function WordChainPage() {
  return (
    <div className="mx-auto w-full px-4 py-8 sm:py-12">
      <GameWordChain />
    </div>
  );
}
