import Link from 'next/link';
import { GAMES } from '@/config/games';

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Branding & Status */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-sm font-bold tracking-tight text-foreground">
                Game<span className="text-sky-500">Portal</span>
              </span>
            </Link>
          </div>

          {/* Center: Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium text-foreground-secondary">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/games" className="hover:text-foreground transition-colors">
              Arcade ({GAMES.length} Games)
            </Link>
            <Link href="/leaderboard" className="hover:text-foreground transition-colors">
              Leaderboards
            </Link>
          </nav>

          {/* Right: Stack Badges & Copyright */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-xs text-foreground-muted">
            <span>© {new Date().getFullYear()} Hoang Long</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
