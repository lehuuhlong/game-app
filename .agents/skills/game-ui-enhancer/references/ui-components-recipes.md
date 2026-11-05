# Game UI Component Recipes

Ready-to-use modern components and snippets following the Game Portal's glassmorphism and Framer Motion standards.

---

## 1. Floating Score Popup (+100, Combo x2)

Spawn this on combos or point increments:

```tsx
import { motion, AnimatePresence } from 'framer-motion';

export interface FloatingTextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  color?: string;
}

export function FloatingScorePopups({ items }: { items: FloatingTextItem[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 1, y: item.y, x: item.x, scale: 0.8 }}
            animate={{ opacity: 0, y: item.y - 40, scale: 1.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className={`absolute font-extrabold text-sm select-none ${item.color || 'text-amber-400'}`}
            style={{ textShadow: '0 0 10px rgba(245, 158, 11, 0.5)' }}
          >
            {item.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

---

## 2. Screen Shake Container

Wrap your game viewport with this to trigger haptic-style visual impacts:

```tsx
import { motion } from 'framer-motion';

export function ScreenShake({
  isShaking,
  children,
}: {
  isShaking: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      animate={
        isShaking
          ? {
              x: [-6, 6, -4, 4, -2, 2, 0],
              y: [4, -4, 3, -3, 1, -1, 0],
            }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
```

---

## 3. High-End HUD Score Card

Modern glassmorphic counter card:

```tsx
export function HudStatCard({
  label,
  value,
  accent = false,
  highlightOnChange = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  highlightOnChange?: boolean;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border/80 bg-surface/70 backdrop-blur-md px-3.5 py-1.5 min-w-[76px] shadow-sm transition-all">
      <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-muted">
        {label}
      </span>
      <span
        key={highlightOnChange ? String(value) : undefined}
        className={`text-lg font-black tabular-nums transition-transform ${
          accent ? 'text-accent' : 'text-foreground'
        } ${highlightOnChange ? 'animate-[scaleUp_0.15s_ease-out]' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
```

---

## 4. Mobile Ergonomic Virtual D-Pad

Touch-friendly controls for mobile users:

```tsx
export function MobileDPad({
  onDirection,
}: {
  onDirection: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 w-44 mx-auto my-4 sm:hidden">
      <div />
      <button
        type="button"
        onTouchStart={(e) => { e.preventDefault(); onDirection('UP'); }}
        onClick={() => onDirection('UP')}
        className="h-12 rounded-xl bg-surface border border-border text-foreground font-bold active:bg-accent active:text-white transition-all shadow-md flex items-center justify-center cursor-pointer"
      >
        ▲
      </button>
      <div />
      <button
        type="button"
        onTouchStart={(e) => { e.preventDefault(); onDirection('LEFT'); }}
        onClick={() => onDirection('LEFT')}
        className="h-12 rounded-xl bg-surface border border-border text-foreground font-bold active:bg-accent active:text-white transition-all shadow-md flex items-center justify-center cursor-pointer"
      >
        ◀
      </button>
      <div />
      <button
        type="button"
        onTouchStart={(e) => { e.preventDefault(); onDirection('RIGHT'); }}
        onClick={() => onDirection('RIGHT')}
        className="h-12 rounded-xl bg-surface border border-border text-foreground font-bold active:bg-accent active:text-white transition-all shadow-md flex items-center justify-center cursor-pointer"
      >
        ▶
      </button>
      <div />
      <button
        type="button"
        onTouchStart={(e) => { e.preventDefault(); onDirection('DOWN'); }}
        onClick={() => onDirection('DOWN')}
        className="h-12 rounded-xl bg-surface border border-border text-foreground font-bold active:bg-accent active:text-white transition-all shadow-md flex items-center justify-center cursor-pointer"
      >
        ▼
      </button>
      <div />
    </div>
  );
}
```

---

## 5. Sleek Victory & Game Over Modal

```tsx
import { motion } from 'framer-motion';

export function ModernGameOverModal({
  score,
  highScore,
  isVictory,
  onRestart,
}: {
  score: number;
  highScore: number;
  isVictory?: boolean;
  onRestart: () => void;
}) {
  const isNewRecord = score >= highScore && score > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute inset-0 bg-background/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-lg p-6 shadow-2xl flex flex-col items-center">
        {/* Animated Trophy / Icon */}
        <div className="text-5xl mb-3 animate-bounce">
          {isVictory ? '🏆' : isNewRecord ? '🌟' : '💀'}
        </div>

        <h3 className="text-2xl font-black text-foreground tracking-tight mb-1">
          {isVictory ? 'Victory!' : isNewRecord ? 'New Best Record!' : 'Game Over'}
        </h3>
        <p className="text-xs text-foreground-secondary mb-6">
          {isNewRecord ? "You surpassed your personal best!" : "Good run! Sharpen your reflexes and try again."}
        </p>

        {/* Score comparison pill */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl border border-border bg-surface-hover/60 p-3">
            <span className="text-[10px] uppercase font-bold text-foreground-muted block">Score</span>
            <span className="text-2xl font-black text-foreground tabular-nums">{score}</span>
          </div>
          <div className="rounded-xl border border-border bg-surface-hover/60 p-3">
            <span className="text-[10px] uppercase font-bold text-foreground-muted block">High Score</span>
            <span className="text-2xl font-black text-accent tabular-nums">{highScore}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onRestart}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 hover:opacity-90 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
        >
          Play Again (Space)
        </button>
      </div>
    </motion.div>
  );
}
```
