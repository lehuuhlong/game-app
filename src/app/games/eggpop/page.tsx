import { GameEggPop } from '@/games/eggpop';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dino Egg Pop — Bubble Shooter Puzzle | Game Portal',
  description:
    'Aim and shoot colorful dino eggs to match 3 or more. Pop clusters and drop orphaned eggs for bonus points in this classic bubble shooter!',
  openGraph: {
    title: 'Dino Egg Pop — Bubble Shooter Puzzle',
    description:
      'Aim and shoot colorful dino eggs to match 3 or more. Pop clusters and drop orphaned eggs for bonus points!',
    type: 'website',
  },
};

export default function EggPopPage() {
  return (
    <div className="mx-auto max-w-4xl px-2 py-4 sm:py-8">
      <GameEggPop />
    </div>
  );
}
