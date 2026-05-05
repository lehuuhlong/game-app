import { GameTrex } from "@/games/trex";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "T-Rex Runner — Game Portal",
  description:
    "Chrome's classic offline dinosaur game. Jump over cacti and dodge pterodactyls in this endless runner!",
};

export default function TrexPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <GameTrex />
    </div>
  );
}
