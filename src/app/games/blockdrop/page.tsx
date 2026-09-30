import { GameBlockDrop } from '@/games/blockdrop';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Retro Block Drop — Classic Falling-Block Puzzle | Game Portal',
  description:
    'Stack falling retro blocks, rotate pieces, clear full lines, and conquer escalating speeds in this classic retro block-drop puzzle.',
  openGraph: {
    title: 'Retro Block Drop — Classic Falling-Block Puzzle',
    description:
      'Stack falling retro blocks, rotate pieces, clear full lines, and conquer escalating speeds.',
    type: 'website',
  },
};

export default function BlockDropPage() {
  return (
    <div className="mx-auto max-w-4xl px-2 py-4 sm:py-8">
      <GameBlockDrop />
    </div>
  );
}
