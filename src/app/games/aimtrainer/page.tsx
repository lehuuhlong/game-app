import { GameAimTrainer } from "@/games/aimtrainer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aim Trainer — Game Portal",
  description:
    "Test your reflexes and precision. Hit as many targets as you can in 60 seconds and track your click accuracy.",
};

export default function AimTrainerPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <GameAimTrainer />
    </div>
  );
}
