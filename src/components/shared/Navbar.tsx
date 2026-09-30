"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { usePerformance } from "./PerformanceProvider";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, LoginModal } from "@/components/auth";
import { PlayerProfileModal } from "@/components/leaderboard/PlayerProfileModal";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Game<span className="text-gradient">Portal</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? "text-accent"
                      : "text-foreground-secondary hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-x-1 -bottom-[1px] h-0.5 rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <GraphicsToggle />
            <ThemeToggle />
            <UserMenu />

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg hover:bg-surface-hover transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle mobile menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-border"
          >
            <nav className="flex flex-col gap-1 px-4 py-3">
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent-light text-accent"
                        : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-2 mt-1 border-t border-border flex items-center justify-between px-2 text-xs text-foreground-secondary">
                <span>Graphics Mode</span>
                <GraphicsToggle />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ── Avatar Component ──────────────────────────────────────────────
function UserAvatar({
  avatarUrl,
  initial,
  size = "md",
}: {
  avatarUrl: string | null;
  initial: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Avatar"
        className={`${dim} rounded-full object-cover shadow-md ring-2 ring-accent/30`}
      />
    );
  }
  return (
    <div className={`${dim} flex items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 font-bold text-white shadow-md`}>
      {initial}
    </div>
  );
}

// ── UserMenu ──────────────────────────────────────────────────────
function UserMenu() {
  const { user } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Not logged in
  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowLoginModal(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface border border-border text-foreground-muted hover:text-foreground hover:border-accent/40 hover:bg-surface-hover transition-all cursor-pointer shadow-xs active:scale-95"
          title="Click to log in / choose username"
          aria-label="Log in"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>

        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onSuccess={() => setShowLoginModal(false)}
          />
        )}
      </>
    );
  }

  const initial = user.username[0]?.toUpperCase() || "?";

  return (
    <>
      {/* Avatar button */}
      <button
        onClick={() => setShowProfileModal(true)}
        className="transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center rounded-full"
        title={`${user.username} - View profile, stats & history`}
        aria-label="User profile and stats"
      >
        <UserAvatar avatarUrl={user.avatarUrl} initial={initial} />
      </button>

      {/* User profile modal */}
      <AnimatePresence>
        {showProfileModal && (
          <PlayerProfileModal
            username={user.username}
            onClose={() => setShowProfileModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground-secondary transition-all duration-200 hover:bg-surface-hover hover:text-foreground hover:border-border-hover"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <AnimatePresence mode="wait">
        {theme === "dark" ? (
          <motion.svg key="sun" initial={{ rotate: -90, opacity: 0, scale: 0 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0 }} transition={{ duration: 0.2 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </motion.svg>
        ) : (
          <motion.svg key="moon" initial={{ rotate: 90, opacity: 0, scale: 0 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: -90, opacity: 0, scale: 0 }} transition={{ duration: 0.2 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}

function GraphicsToggle() {
  const { graphicsMode, toggleGraphicsMode } = usePerformance();
  const isEco = graphicsMode === "eco";

  return (
    <button
      onClick={toggleGraphicsMode}
      className={`relative flex h-9 items-center gap-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all duration-200 ${
        isEco
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
          : "border-border bg-surface text-foreground-secondary hover:bg-surface-hover hover:text-foreground hover:border-border-hover"
      }`}
      aria-label={isEco ? "Performance Mode (Eco 60fps) active" : "Ultra 3D Graphics active"}
      title={isEco ? "Eco Mode: 0% GPU load (Click for 3D High)" : "3D Mode: High Graphics (Click for Eco 60fps)"}
    >
      <span className="text-sm">{isEco ? "⚡" : "🎮"}</span>
      <span className="hidden sm:inline font-mono text-xs tracking-tight">
        {isEco ? "Eco 60fps" : "3D High"}
      </span>
    </button>
  );
}

