---
name: game-ui-enhancer
description: >-
  Use this skill whenever the user asks to polish, modernize, or elevate the UI/UX of a game or portal page
  to look sleek, modern, and high-end ("trông xịn hơn"). Covers glassmorphism, Framer Motion springs,
  game juice (screen shake, floating combo popups, particle bursts), Web Audio synthesizer sound design,
  and responsive mobile layout improvements.
---

# Game UI Enhancer Skill

This skill provides design recipes, micro-interactions, animation standards, and visual patterns to elevate any game in the portal from a functional prototype to a visually stunning ("xịn") arcade experience.

---

## 1. Visual Polish Principles ("The Neon Sanctuary Aesthetic")

To make any UI look high-end:

1. **Layered Depth & Glassmorphism**:
   - Don't use flat solid backgrounds. Use layered surfaces:
     - Base canvas: `bg-background` (`#050a18`)
     - Card / Panel: `bg-surface/70 backdrop-blur-md border border-border/80 shadow-lg`
     - Nested Stat Pill: `bg-surface-hover/80 border border-border/60`
2. **Neon Glow & Light Accents**:
   - Accent high-value stats or actions with luminous gradients:
     `bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600`
   - Use subtle outer ring glow on focused elements: `shadow-[0_0_20px_rgba(56,189,248,0.25)]`
3. **Dynamic Font Hierarchy & Monospace Numbers**:
   - Always use `tabular-nums font-mono` or `font-extrabold` for score counters, timers, and combos so numbers do not jump or jitter during rapid updates.
4. **Juice & Tactile Micro-Interactions**:
   - Buttons: `active:scale-95 transition-transform duration-100`
   - Cards: `hover:-translate-y-1 hover:border-accent/40 transition-all duration-200`
   - Success states: Pop with a spring scale `scale(1.15) -> scale(1.0)`
5. **English Language Standard (STRICT)**:
   - All enhanced UI elements, HUD stat pills, button labels, modal dialogues, floating combo popups (`Combo x2!`, `Perfect!`, `Level Up!`), and keyboard hints (`[WASD] to move`) must be strictly in English. Never inject Vietnamese or non-English copy into game UI components.

---

## 2. Essential UI Recipes

Refer to [ui-components-recipes.md](./references/ui-components-recipes.md) for full implementation code:

1. **Floating Score Popups (`FloatingScorePopup`)**:
   - When points are scored, spawn a floating `+50` or `+Combo x2!` text drifting upward and fading out with Framer Motion.
2. **Screen Shake Wrapper (`ScreenShake`)**:
   - On critical collisions, low health, or explosion events, briefly shake the viewport using an animated offset `[-4, 4, -2, 2, 0]`.
3. **Particle Burst (`ParticleCanvas` / `Confetti`)**:
   - Synthesize 20-30 glowing sparks or confetti pieces on high-score or level clear.
4. **Mobile Responsive D-Pad & Control Bar (`VirtualGamepad`)**:
   - Render touch-friendly ergonomic directional buttons and action pads when viewed on mobile screens.
5. **Modern Game Over / Victory Modal**:
   - Featuring star ratings (⭐⭐⭐), score breakdown with count-up animations, medal badges, and an immediate replay action (`Space` hotkey).

---

## 3. UI Upgrade Audit Checklist

When asked to "make a game look xịn hơn", perform this audit:

- [ ] **Canvas borders**: Replace plain square canvas with `rounded-2xl border border-border/80 shadow-2xl overflow-hidden`.
- [ ] **Scoreboard**: Upgrade raw numbers into dedicated HUD cards with uppercase tracking labels and luminous numbers.
- [ ] **Sounds**: Ensure every interaction (tap, move, match, hit, game over, victory) triggers an immediate, satisfying Web Audio frequency sweep.
- [ ] **Controls Hint**: Display sleek `<kbd>` tags below the board (e.g. `[WASD] to move`, `[Space] to jump`, `[R] to restart`).
- [ ] **Mobile Responsiveness**: Verify the board shrinks gracefully on mobile displays using dynamic viewport measurement (`containerRef.clientWidth`).
- [ ] **Pause & Game Over Overlays**: Use blurred glassmorphic backdrops (`backdrop-blur-md bg-background/80`) rather than jarring opaque screens.
- [ ] **100% English Compliance**: Verify all HUD labels, buttons, combo popups, modals, and control hints are exclusively in English.
