---
name: Game Portal
description: Modern web gaming portal featuring classic logic puzzles and real-time multiplayer games
colors:
  primary: "#3b82f6"
  primary-glow: "#38bdf8"
  primary-hover: "#2563eb"
  secondary: "#f59e0b"
  secondary-deep: "#ea580c"
  background: "#050a18"
  background-secondary: "#0c1425"
  surface: "#111827"
  surface-hover: "#1e293b"
  foreground: "#f1f5f9"
  foreground-secondary: "#94a3b8"
  foreground-muted: "#64748b"
  border: "#1e293b"
  border-hover: "#334155"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "10px"
  md: "16px"
  lg: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  card-base:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "20px 24px"
  input-base:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
---

# Design System: Game Portal

## Overview

**Creative North Star: "The Neon Arcade Sanctuary"**

Game Portal is a tactile, energetic, modern gaming sanctuary designed for frictionless immersion across desktop and mobile devices. Built upon deep dark-slate canvas tones, luminous cyan and electric azure energy, and frosted glassmorphic layers, the system balances high-octane gaming excitement with clean, distraction-free board readability.

The visual interface prioritizes immediate playability: interactive cards invite engagement with subtle shimmer highlights and upward hover lifts; navigation and modal sheets float naturally above deep canvas backdrops; and crisp typography ensures score counters, turn timers, and logic board tiles are legible at a glance.

**Key Characteristics:**
- Deep dark-mode first canvas (#050a18) with animated, subtle ambient background glow orbs.
- Frosted glassmorphism (16px blur with 1px translucent borders) across headers, cards, and modal dialogs.
- Vibrant sky-to-blue gradient accents reserved for high-value interactive calls-to-action.
- Tactile hover micro-interactions: card elevation lift, subtle shimmer wipes, and bouncy modal springs.

## Colors

The palette pairs deep atmospheric navy and charcoal surfaces with energetic electric azure, luminous sky cyan, and warm solar amber accents.

### Primary
- **Electric Azure** (#3b82f6): Core interactive accent used for primary buttons, active link indicators, and turn state markers.
- **Luminous Sky** (#38bdf8): High-visibility glow accent used for headline text gradients, focused states, and badge highlights.
- **Electric Hover** (#2563eb): Deepened azure used for pressed and hover states.

### Secondary
- **Solar Amber** (#f59e0b): Warm energetic accent for special achievement badges, high scores, and arcade card gradients.
- **Flare Orange** (#ea580c): Supporting warm tone used in card gradient pairings and timer warning countdowns.

### Neutral
- **Abyssal Navy** (#050a18): Deep base canvas background.
- **Nightfall Secondary** (#0c1425): Sub-surface canvas for nested game arenas and board containers.
- **Deep Slate Surface** (#111827): Elevated surface layer for cards, sidebars, and dialog modals.
- **Slate Surface Hover** (#1e293b): Interactive surface hover color and primary border tone.
- **Crisp Foreground** (#f1f5f9): Primary high-contrast text and icon color.
- **Muted Slate** (#94a3b8): Secondary descriptive text and sub-labels.
- **Faint Slate** (#64748b): Tertiary text, disabled states, and subtle placeholder hints.

### Named Rules
**The Luminous Focus Rule.** Deep dark backgrounds anchor the entire viewport. Neon accents and luminous gradient highlights are strictly reserved for active game moves, turn counters, and primary CTAs—never applied as overwhelming full-screen background floods.

## Typography

**Display Font:** Inter (with system-ui, -apple-system, sans-serif fallback)
**Body Font:** Inter (with system-ui, -apple-system, sans-serif fallback)
**Label / Number Font:** Geist Mono / Inter Mono (for timers, scores, and move notations)

**Character:** Modern, clean, geometric sans-serif delivering razor-sharp legibility across high-DPI displays and compact mobile screens, paired with tabular mono digits for jitter-free score counters.

### Hierarchy
- **Display** (800 / Extrabold, clamp(2rem, 5vw, 3.5rem), line-height: 1.1): Hero portal title and promotional banner headlines.
- **Headline** (700 / Bold, clamp(1.5rem, 3vw, 2.25rem), line-height: 1.2): Section headers ("All Games", "Global Leaderboard").
- **Title** (700 / Bold, 1.25rem, line-height: 1.3): Game card titles, modal headers, and player name badges.
- **Body** (400 / Regular, 0.875rem, line-height: 1.5): Game descriptions, lobby chat messages, and rules explanations.
- **Label** (600 / Semibold, 0.75rem, letter-spacing: 0.05em, uppercase): Player count badges, difficulty chips, and column headers.

### Named Rules
**The Stable Numerics Rule.** All timer counters, high scores, and live move clocks must use monospace / tabular font variants (`Geist Mono`) to prevent visual jitter and layout width shifts during rapid countdowns.

## Layout

- **Max Width Containers:** Main content uses a structured 1280px max-width container (`max-w-7xl`) centered with responsive gutters (`px-4 sm:px-6 lg:px-8`).
- **Responsive Game Grid:** Game catalogs dynamically scale from 1 column on mobile screens (`grid-cols-1`), to 2 columns on tablets (`sm:grid-cols-2`), and 3-4 columns on desktop displays (`lg:grid-cols-3 xl:grid-cols-4`).
- **Game Arena Centering:** In-game play screens center the active board (Sudoku 9x9, Caro grid, 2048 tiles, Wordle board) vertically and horizontally with sticky header HUD controls.
- **Rhythm & Spacing:** Standard spatial increments follow 8px steps (8px, 16px, 24px, 32px, 48px).

## Elevation & Depth

Game Portal utilizes a hybrid elevation model combining frosted glassmorphism planes with layered drop shadows and ambient glowing halos.

### Shadow Vocabulary
- **Shadow Sub-surface** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.3)`): Subtle edge separation for chips and small buttons.
- **Shadow Card Hover** (`box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)`): Deep tactile shadow during card hover elevation.
- **Shadow Neon Glow** (`box-shadow: 0 0 60px rgba(56, 189, 248, 0.2)`): Ambient cyan glow radiating behind hero badges and winner announcement cards.

### Named Rules
**The Glass Depth Hierarchy Rule.** The base canvas rests flat at `#050a18`. Interactive cards and navigation rise into frosted glass layers (`rgba(17, 24, 39, 0.7)` with `backdrop-filter: blur(16px)`), and active modals float with deep multi-stop drop shadows.

## Shapes

- **Base Radius:** 16px (`--radius: 16px` / `rounded-2xl`) for game cards, lobby panels, and dialogue windows.
- **Small Radius:** 10px (`--radius-sm: 10px` / `rounded-xl`) for text inputs, action buttons, and individual game board tiles.
- **Large Radius:** 24px (`--radius-lg: 24px` / `rounded-3xl`) for hero banners and leaderboard containers.
- **Pill Geometry:** 9999px (`rounded-full`) for player avatar containers, tag chips, and online status badges.
- **Border Treatment:** Consistent 1px subtle strokes (`#1e293b`) with hover transition to `#334155`.

## Components

### Primary Buttons
- **Shape:** 12px / 16px rounded rectangular pill (`rounded-xl`).
- **Color:** Gradient fill (`linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)`) with white text.
- **Hover / Focus:** Lifts with `transform: translateY(-2px)`, deepens shadow to `rgba(59, 130, 246, 0.4)`, smooth 200ms transition.

### Game Cards
- **Structure:** Two-tier card with top 192px thumbnail / gradient header housing game icon and player badge, and bottom content drawer housing title, description, and tag chips.
- **Hover Effect:** `card-shimmer` sweep, `-translate-y-1` lift, and revealed circular play CTA button.
- **Background:** `#111827` surface with 1px `#1e293b` border.

### Inputs / Text Fields
- **Style:** Dark background `#050a18`, 1px `#1e293b` border, 10px radius (`rounded-xl`), 12px 16px padding.
- **Focus:** 1px `#38bdf8` border with `0 0 0 3px rgba(56, 189, 248, 0.2)` ring.

### Navigation Bar
- **Style:** Sticky top-0 glass bar (`rgba(17, 24, 39, 0.7)` with `backdrop-filter: blur(16px)`), 64px height, 1px bottom border.
- **Active State:** Cyan underline indicator (`bg-accent`) with spring layout transition (`layoutId="nav-indicator"`).

### Stat & Badge Chips
- **Style:** Frosted translucent background with light accent border, rounded-full or rounded-lg geometry, paired with crisp SVG icons.

## Do's and Don'ts

### Do:
- **Do** use gradient text highlights (`linear-gradient(135deg, #38bdf8, #3b82f6)`) on hero titles and key milestones.
- **Do** wrap interactive cards with `.card-shimmer` and smooth `-translate-y-1` hover lift for tactile responsiveness.
- **Do** preserve high contrast (`#f1f5f9` text on `#111827` surfaces) across all board states and menus.
- **Do** use monospace tabular digits (`Geist Mono`) for timers, scores, and turn counters.
- **Do** apply `backdrop-filter: blur(16px)` whenever using semi-transparent glass backgrounds.

### Don't:
- **Don't** flood entire page backgrounds with solid saturated colors; keep the deep dark canvas (`#050a18`) intact.
- **Don't** use sharp unrounded corners; adhere to the 10px / 16px / 24px continuous radius curve.
- **Don't** use abrupt instantaneous state transitions; always apply smooth 200–250ms transitions (`cubic-bezier(0.4, 0, 0.2, 1)`).
- **Don't** mix non-standard neon hues (e.g. lime green or harsh magenta) into core navigation components outside of game-specific theme palettes.
