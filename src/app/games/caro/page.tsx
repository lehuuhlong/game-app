import { GameCaro } from "@/games/caro";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Caro — Game Portal",
  description:
    "Play Caro — 5-in-a-row strategy game. Challenge a friend online!",
};

export default function CaroPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <GameCaro />
    </div>
  );
}
