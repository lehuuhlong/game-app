import type { Metadata } from "next";
import { GameBilliards } from "@/games/billiards";

export const metadata: Metadata = {
  title: "8 Ball Pool — Game Portal",
  description:
    "Play classic 8-ball billiards with realistic physics. Online 2-player room creation and local pass & play with drag-to-shoot mechanics.",
};

export default function BilliardsPage() {
  return (
    <main className="mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-10">
      <GameBilliards />
    </main>
  );
}
