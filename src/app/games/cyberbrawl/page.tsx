import { GameCyberBrawl } from '@/games/cyberbrawl';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cyber Brawl — 2D Arcade Fighting Game | Game Portal',
  description:
    'High-octane 2D arcade fighting game with fixed 60 FPS physics, precise frame data startup/active/recovery windows, pushbox separation, and color-coded hitbox visualization.',
  openGraph: {
    title: 'Cyber Brawl — 2D Arcade Fighting Game',
    description: 'Classic arcade 2D fighter with fixed-timestep physics and hitbox debugging.',
    type: 'website',
  },
};

export default function CyberBrawlPage() {
  return (
    <div className="mx-auto max-w-5xl px-2 sm:px-4 py-4 sm:py-8">
      <GameCyberBrawl />
    </div>
  );
}
