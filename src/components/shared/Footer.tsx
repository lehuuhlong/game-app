import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: branding */}
          <div className="flex items-center gap-2">
            {/* <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div> */}
            <span className="text-sm font-semibold text-foreground">
              Game<span className="text-gradient">Portal</span>
            </span>
          </div>

          {/* Center: links */}
          <nav className="flex items-center gap-6 text-sm text-foreground-secondary">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/leaderboard" className="hover:text-foreground transition-colors">
              Leaderboard
            </Link>
            <a
              href="https://github.com/lehuuhlong"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </nav>

          {/* Right: copyright */}
          <p className="text-xs text-foreground-muted">
            © {new Date().getFullYear()} GamePortal. Copy Right by LE HUU HOANG LONG.
          </p>
        </div>
      </div>
    </footer>
  );
}
