import { GamePikachu } from '@/games/pikachu';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pikachu (Onet Link) — Game Portal',
  description:
    'Play classic Pikachu / Onet Link pair matching game. Connect identical pairs with at most 2 bends, unlock combos, and beat the clock!',
};

export default function PikachuPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <GamePikachu />
    </main>
  );
}
