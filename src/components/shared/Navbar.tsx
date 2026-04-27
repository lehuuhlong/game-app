"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth";

const navLinks = [
  { href: "/", label: "Home" },
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
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/25 transition-transform duration-300 group-hover:scale-110">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Game<span className="text-gradient">Portal</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
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
          <div className="flex items-center gap-3">
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
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-accent-light text-accent"
                      : "text-foreground-secondary hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
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
  const { user, logout, changeUsername, updateAvatar } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSaveName = async () => {
    setEditError("");
    setSaving(true);
    const result = await changeUsername(newName);
    setSaving(false);
    if (result.error) {
      setEditError(result.error);
    } else {
      setEditing(false);
    }
  };

  const handleAvatarFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      alert("Image must be under 1 MB");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const result = await updateAvatar(reader.result as string);
      if (result.error) alert(result.error);
      setUploading(false);
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = "";
  }, [updateAvatar]);

  // Not logged in
  if (!user) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface border border-border text-foreground-muted" title="Not logged in">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
    );
  }

  const initial = user.username[0]?.toUpperCase() || "?";
  const winRate = user.caroTotal > 0 ? Math.round((user.caroWins / user.caroTotal) * 100) : 0;

  return (
    <div ref={ref} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => { setOpen((v) => !v); setEditing(false); }}
        className="transition-transform duration-200 hover:scale-105"
        title={user.username}
      >
        <UserAvatar avatarUrl={user.avatarUrl} initial={initial} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-surface shadow-xl z-50 overflow-hidden"
          >
            {/* Avatar + username section */}
            <div className="px-4 pt-4 pb-3 border-b border-border">
              {/* Avatar upload area */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <UserAvatar avatarUrl={user.avatarUrl} initial={initial} size="md" />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploading ? (
                      <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarFile}
                />
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <div className="space-y-1.5">
                      <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditing(false); }}
                        placeholder="New username..."
                        className="w-full rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-foreground focus:border-accent focus:outline-none"
                      />
                      {editError && <p className="text-xs text-red-500">{editError}</p>}
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleSaveName}
                          disabled={saving}
                          className="flex-1 rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => { setEditing(false); setEditError(""); }}
                          className="rounded-lg px-2 py-1 text-xs text-foreground-muted hover:bg-surface-hover"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
                      <button
                        onClick={() => { setEditing(true); setNewName(user.username); }}
                        className="text-xs text-foreground-muted hover:text-accent transition-colors flex items-center gap-1 mt-0.5"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Change username
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-background p-2">
                <div className="text-center">
                  <p className="text-[10px] text-foreground-muted">Best 2048</p>
                  <p className="text-xs font-bold text-foreground">{user.bestScore2048.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-foreground-muted">Caro Wins</p>
                  <p className="text-xs font-bold text-foreground">{user.caroWins}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-foreground-muted">Win Rate</p>
                  <p className="text-xs font-bold text-foreground">{winRate}%</p>
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground-secondary transition-all duration-200 hover:bg-surface-hover hover:text-foreground hover:border-border-hover"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
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
