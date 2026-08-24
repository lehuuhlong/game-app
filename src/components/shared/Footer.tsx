import Link from 'next/link';

export function Footer() {
  return (
    <footer className="relative border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Branding & Status */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 group-hover:border-sky-400 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <span className="text-sm font-bold tracking-tight text-white">
                Game<span className="text-sky-400">Portal</span>
              </span>
            </Link>

            <span className="hidden sm:inline text-slate-700">|</span>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Center: Navigation Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-medium text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/games" className="hover:text-white transition-colors">
              Arcade ({11} Games)
            </Link>
            <Link href="/leaderboard" className="hover:text-white transition-colors">
              Leaderboards
            </Link>
            <a
              href="https://github.com/lehuuhlong/game-app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors text-slate-300"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </a>
          </nav>

          {/* Right: Stack Badges & Copyright */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                <svg width="12" height="12" viewBox="0 0 76 65" fill="currentColor">
                  <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                </svg>
                Vercel
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                Next.js 16
              </span>
            </div>

            <span className="hidden sm:inline text-slate-700">•</span>
            <span>© {new Date().getFullYear()} Hoang Long</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
