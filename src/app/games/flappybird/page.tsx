import type { Metadata } from "next";
import { GameFlappyBird } from "@/games/flappybird";

export const metadata: Metadata = {
  title: "Flappy Bird — Game Portal",
  description: "Flap through the pipes and chase a new high score in this fast-paced arcade classic.",
};

export default function FlappyBirdPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <GameFlappyBird />
    </main>
  );
}

