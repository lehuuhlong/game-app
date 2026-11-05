import type { Metadata } from 'next';
import { GameNonogram } from '@/games/nonogram';

export const metadata: Metadata = {
  title: 'Neon Nonogram — Game Portal',
  description:
    'Deduce row and column number clues to illuminate hidden pixel art in this classic Japanese logic picture puzzle.',
};

export default function NonogramPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <GameNonogram />
    </main>
  );
}
