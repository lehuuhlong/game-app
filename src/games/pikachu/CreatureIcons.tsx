import React from 'react';

export interface CreatureIconProps {
  type: number;
  className?: string;
  size?: number;
}

/**
 * High-performance, cross-platform vector SVG icons for all 24 Pikachu creatures.
 * Renders identically across Windows 10, Windows 11, iOS, macOS, and Android.
 * Vector paths with clean geometric and organic curves, optimized for 32x32 to 48x48 tile grids.
 */

// 0. Pikachu - Electric Mouse (Yellow face, black-tipped ears, red cheeks, lightning bolt)
const PikachuSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Left Ear */}
    <path d="M11 14L4 4L13 9Z" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
    <path d="M4 4L8 6.5L6 9Z" fill="#18181b" />
    {/* Right Ear */}
    <path d="M25 14L32 4L23 9Z" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
    <path d="M32 4L28 6.5L30 9Z" fill="#18181b" />
    {/* Head */}
    <ellipse cx="18" cy="21" rx="11" ry="10" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
    {/* Red Cheeks */}
    <circle cx="10" cy="23" r="2.8" fill="#ef4444" />
    <circle cx="26" cy="23" r="2.8" fill="#ef4444" />
    {/* Eyes */}
    <circle cx="13.5" cy="19" r="1.8" fill="#18181b" />
    <circle cx="13" cy="18.3" r="0.6" fill="#ffffff" />
    <circle cx="22.5" cy="19" r="1.8" fill="#18181b" />
    <circle cx="22" cy="18.3" r="0.6" fill="#ffffff" />
    {/* Nose */}
    <ellipse cx="18" cy="21" rx="0.8" ry="0.5" fill="#18181b" />
    {/* Mouth */}
    <path d="M15.5 23.5Q16.8 25 18 23.5Q19.2 25 20.5 23.5" stroke="#18181b" strokeWidth="1" strokeLinecap="round" fill="none" />
  </svg>
);

// 1. Charmander - Fire Lizard (Orange lizard, big teal eyes, burning flame)
const CharmanderSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Flame backdrop */}
    <path d="M26 28C26 21 34 19 32 12C29 17 27 18 26 28Z" fill="#fbbf24" opacity="0.8" />
    <path d="M27 28C27 23 32 21 31 16C29 19 28 21 27 28Z" fill="#ef4444" />
    {/* Head & Body */}
    <ellipse cx="17" cy="19" rx="10" ry="10" fill="#f97316" stroke="#c2410c" strokeWidth="0.8" />
    {/* Cream Belly */}
    <ellipse cx="17" cy="24" rx="6" ry="4" fill="#fef08a" opacity="0.9" />
    {/* Big Anime Eyes */}
    <ellipse cx="12.5" cy="16.5" rx="2.4" ry="3" fill="#0284c7" />
    <circle cx="12" cy="15.5" r="0.9" fill="#ffffff" />
    <ellipse cx="21.5" cy="16.5" rx="2.4" ry="3" fill="#0284c7" />
    <circle cx="21" cy="15.5" r="0.9" fill="#ffffff" />
    {/* Snout & Smile */}
    <circle cx="15.5" cy="19.5" r="0.5" fill="#c2410c" />
    <circle cx="18.5" cy="19.5" r="0.5" fill="#c2410c" />
    <path d="M13 21.5Q17 25 21 21.5" stroke="#9a3412" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);

// 2. Squirtle - Tiny Turtle (Sky blue head, shell rim, water splash curl)
const SquirtleSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Shell Back Rim */}
    <circle cx="18" cy="18" r="13" fill="#b45309" stroke="#78350f" strokeWidth="0.8" />
    <circle cx="18" cy="18" r="11.5" fill="#fef08a" />
    {/* Turtle Head */}
    <circle cx="18" cy="18" r="9.5" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" />
    {/* Shell Rim Collar */}
    <path d="M10 26C13 28 23 28 26 26" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    {/* Big Red-Purple Eyes */}
    <ellipse cx="14" cy="16" rx="2" ry="2.6" fill="#991b1b" />
    <circle cx="13.5" cy="15" r="0.8" fill="#ffffff" />
    <ellipse cx="22" cy="16" rx="2" ry="2.6" fill="#991b1b" />
    <circle cx="21.5" cy="15" r="0.8" fill="#ffffff" />
    {/* Nostrils & Smile */}
    <path d="M15 21.5Q18 24 21 21.5" stroke="#0369a1" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);

// 3. Bulbasaur - Seed Pokémon (Teal-green face, plant bulb, emerald spots)
const BulbasaurSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Green Plant Bulb on Top */}
    <path d="M18 3C12 9 12 15 18 17C24 15 24 9 18 3Z" fill="#10b981" stroke="#047857" strokeWidth="0.8" />
    <path d="M18 3C16 8 16 13 18 17" stroke="#34d399" strokeWidth="1" />
    {/* Ears */}
    <path d="M10 13L5 8L12 11Z" fill="#2dd4bf" stroke="#0d9488" strokeWidth="0.8" />
    <path d="M26 13L31 8L24 11Z" fill="#2dd4bf" stroke="#0d9488" strokeWidth="0.8" />
    {/* Head */}
    <ellipse cx="18" cy="21" rx="10" ry="8.5" fill="#2dd4bf" stroke="#0d9488" strokeWidth="0.8" />
    {/* Forehead Spots */}
    <rect x="16.5" y="15" width="3" height="2.5" rx="1" fill="#0f766e" />
    <rect x="11.5" y="17" width="2" height="2" rx="0.6" fill="#0f766e" />
    {/* Red Eyes */}
    <path d="M11 20L15 19L14 22Z" fill="#ef4444" />
    <circle cx="12.5" cy="20.5" r="0.6" fill="#ffffff" />
    <path d="M25 20L21 19L22 22Z" fill="#ef4444" />
    <circle cx="23.5" cy="20.5" r="0.6" fill="#ffffff" />
    {/* Cute smile */}
    <path d="M15 24Q18 26.5 21 24" stroke="#0f766e" strokeWidth="1" strokeLinecap="round" fill="none" />
  </svg>
);

// 4. Gengar - Shadow Pokémon (Sinister purple body, spiked ears, red eyes & jagged grin)
const GengarSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Head Spikes */}
    <path d="M7 11L4 4L13 9" fill="#9333ea" stroke="#7e22ce" strokeWidth="0.8" />
    <path d="M29 11L32 4L23 9" fill="#9333ea" stroke="#7e22ce" strokeWidth="0.8" />
    <path d="M14 8L18 3L22 8" fill="#9333ea" stroke="#7e22ce" strokeWidth="0.8" />
    {/* Round Body */}
    <circle cx="18" cy="20" r="11" fill="#9333ea" stroke="#7e22ce" strokeWidth="0.8" />
    {/* Slanted Crimson Eyes */}
    <path d="M10 16L16 18.5L11 20Z" fill="#ef4444" />
    <circle cx="12.5" cy="18" r="0.7" fill="#ffffff" />
    <path d="M26 16L20 18.5L25 20Z" fill="#ef4444" />
    <circle cx="23.5" cy="18" r="0.7" fill="#ffffff" />
    {/* Jagged Toothy Grin */}
    <path d="M10 23Q18 30 26 23Q18 26 10 23Z" fill="#ffffff" stroke="#581c87" strokeWidth="0.8" />
    <line x1="14" y1="24" x2="14" y2="26" stroke="#581c87" strokeWidth="0.8" />
    <line x1="18" y1="24.5" x2="18" y2="27.5" stroke="#581c87" strokeWidth="0.8" />
    <line x1="22" y1="24" x2="22" y2="26" stroke="#581c87" strokeWidth="0.8" />
  </svg>
);

// 5. Jigglypuff - Balloon Pokémon (Soft pink, curl tuft, giant emerald eyes)
const JigglypuffSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Cat Ears */}
    <path d="M9 13L5 5L14 9Z" fill="#f472b6" stroke="#db2777" strokeWidth="0.8" />
    <path d="M8 11L6 6L11 9Z" fill="#475569" />
    <path d="M27 13L31 5L22 9Z" fill="#f472b6" stroke="#db2777" strokeWidth="0.8" />
    <path d="M28 11L30 6L25 9Z" fill="#475569" />
    {/* Round Body */}
    <circle cx="18" cy="20" r="11" fill="#f472b6" stroke="#db2777" strokeWidth="0.8" />
    {/* Forehead Curl */}
    <path d="M16 11C14 8 17 5 19.5 6C22 7 21 11 18 11C16 11 15 9.5 16 8.5" fill="#f472b6" stroke="#db2777" strokeWidth="1" />
    {/* Giant Emerald Eyes */}
    <circle cx="13" cy="19" r="3.2" fill="#059669" />
    <circle cx="13" cy="19" r="2.2" fill="#10b981" />
    <circle cx="12" cy="18" r="1" fill="#ffffff" />
    <circle cx="23" cy="19" r="3.2" fill="#059669" />
    <circle cx="23" cy="19" r="2.2" fill="#10b981" />
    <circle cx="22" cy="18" r="1" fill="#ffffff" />
    {/* Mouth */}
    <path d="M16.5 25Q18 27 19.5 25" stroke="#9d174d" strokeWidth="1.2" strokeLinecap="round" fill="#be185d" />
  </svg>
);

// 6. Snorlax - Sleeping Giant (Dark teal-slate head, cream mask, sleeping slit eyes & fangs)
const SnorlaxSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Ears */}
    <path d="M9 13L6 4L14 9Z" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />
    <path d="M27 13L30 4L22 9Z" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />
    {/* Head */}
    <circle cx="18" cy="20" r="11.5" fill="#334155" stroke="#1e293b" strokeWidth="0.8" />
    {/* Cream Face Patch */}
    <ellipse cx="18" cy="21.5" rx="8" ry="6.5" fill="#fef3c7" />
    {/* Slit Closed Eyes */}
    <path d="M12 20Q14.5 18.5 16.5 20" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    <path d="M19.5 20Q21.5 18.5 24 20" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    {/* Little Fangs */}
    <polygon points="15,24 16,22 17,24" fill="#ffffff" stroke="#334155" strokeWidth="0.5" />
    <polygon points="19,24 20,22 21,24" fill="#ffffff" stroke="#334155" strokeWidth="0.5" />
    <path d="M16 24Q18 25.5 20 24" stroke="#334155" strokeWidth="1" fill="none" />
  </svg>
);

// 7. Mewtwo - Psychic Titan (Lavender alien head, purple psychic horns & glowing psychic orb)
const MewtwoSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Psychic Aura Ring */}
    <circle cx="18" cy="18" r="13" stroke="#c084fc" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6" />
    {/* Horn Crests */}
    <path d="M12 14L8 6L14 9Z" fill="#d8b4fe" stroke="#9333ea" strokeWidth="0.8" />
    <path d="M24 14L28 6L22 9Z" fill="#d8b4fe" stroke="#9333ea" strokeWidth="0.8" />
    {/* Sleek Feline Head */}
    <path d="M13 14C13 10 23 10 23 14C24 19 22 25 18 26C14 25 12 19 13 14Z" fill="#e9d5ff" stroke="#9333ea" strokeWidth="0.8" />
    {/* Purple Neck Tube */}
    <path d="M16 26C16 29 20 29 20 26" stroke="#7e22ce" strokeWidth="2" strokeLinecap="round" />
    {/* Piercing Purple Eyes */}
    <path d="M14 17L17 18L14 19Z" fill="#7e22ce" />
    <path d="M22 17L19 18L22 19Z" fill="#7e22ce" />
    {/* Forehead Psychic Gem / Crest */}
    <circle cx="18" cy="13" r="1.5" fill="#a855f7" />
  </svg>
);

// 8. Dragonite - Dragon Pokémon (Warm amber-orange, friendly antennae, cream belly)
const DragoniteSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Wavy Antennae */}
    <path d="M16 9C15 4 12 3 10 2" stroke="#ea580c" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    <path d="M20 9C21 4 24 3 26 2" stroke="#ea580c" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    {/* Small White Horn */}
    <polygon points="17,10 18,6 19,10" fill="#ffffff" stroke="#c2410c" strokeWidth="0.6" />
    {/* Head */}
    <ellipse cx="18" cy="19" rx="10" ry="9" fill="#fb923c" stroke="#c2410c" strokeWidth="0.8" />
    {/* Gentle Emerald Eyes */}
    <ellipse cx="13.5" cy="17" rx="2" ry="2.5" fill="#059669" />
    <circle cx="13" cy="16" r="0.7" fill="#ffffff" />
    <ellipse cx="22.5" cy="17" rx="2" ry="2.5" fill="#059669" />
    <circle cx="22" cy="16" r="0.7" fill="#ffffff" />
    {/* Cute Snout & Smile */}
    <ellipse cx="18" cy="22" rx="4" ry="2" fill="#fed7aa" />
    <path d="M16 23Q18 24.5 20 23" stroke="#9a3412" strokeWidth="1" strokeLinecap="round" fill="none" />
  </svg>
);

// 9. Eevee - Evolution Pokémon (Honey brown fox, giant fluffy cream ruff, long ears)
const EeveeSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Tall Fox Ears */}
    <path d="M11 15L3 3L15 9Z" fill="#b45309" stroke="#78350f" strokeWidth="0.8" />
    <path d="M9 13L5 5L12 9Z" fill="#78350f" />
    <path d="M25 15L33 3L21 9Z" fill="#b45309" stroke="#78350f" strokeWidth="0.8" />
    <path d="M27 13L31 5L24 9Z" fill="#78350f" />
    {/* Head */}
    <circle cx="18" cy="18" r="8.5" fill="#d97706" stroke="#92400e" strokeWidth="0.8" />
    {/* Sparkling Brown Eyes */}
    <ellipse cx="14" cy="16.5" rx="1.8" ry="2.5" fill="#451a03" />
    <circle cx="13.5" cy="15.5" r="0.7" fill="#ffffff" />
    <ellipse cx="22" cy="16.5" rx="1.8" ry="2.5" fill="#451a03" />
    <circle cx="21.5" cy="15.5" r="0.7" fill="#ffffff" />
    {/* Tiny Nose */}
    <polygon points="17.5,19 18.5,19 18,19.8" fill="#451a03" />
    {/* Fluffy Cream Mane Ruff */}
    <path d="M10 25C8 28 14 31 18 29C22 31 28 28 26 25C24 23 20 25 18 24C16 25 12 23 10 25Z" fill="#fef3c7" stroke="#d97706" strokeWidth="0.8" />
  </svg>
);

// 10. Psyduck - Duck Pokémon (Yellow platypus, bewildered dot eyes, wide duck bill)
const PsyduckSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* 3 Spiky Black Hairs on Top */}
    <path d="M16 8L14 3" stroke="#18181b" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M18 8L18 2" stroke="#18181b" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M20 8L22 3" stroke="#18181b" strokeWidth="1.2" strokeLinecap="round" />
    {/* Head */}
    <circle cx="18" cy="18" r="9.5" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
    {/* Confused Wide White Eyes with Tiny Pupil Dots */}
    <circle cx="13" cy="15" r="2.8" fill="#ffffff" stroke="#ca8a04" strokeWidth="0.6" />
    <circle cx="13" cy="15" r="0.9" fill="#18181b" />
    <circle cx="23" cy="15" r="2.8" fill="#ffffff" stroke="#ca8a04" strokeWidth="0.6" />
    <circle cx="23" cy="15" r="0.9" fill="#18181b" />
    {/* Wide Flat Cream Duck Bill */}
    <ellipse cx="18" cy="22" rx="7.5" ry="4" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
    <circle cx="16" cy="21" r="0.6" fill="#ca8a04" />
    <circle cx="20" cy="21" r="0.6" fill="#ca8a04" />
  </svg>
);

// 11. Magikarp - Fish Pokémon (Red fish, golden 3-crown fin, blank eye, whiskers)
const MagikarpSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Golden Royal Crown Dorsal Fin */}
    <path d="M13 11L11 4L15 8L18 3L21 8L25 4L23 11Z" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" />
    {/* Orange-Red Fish Body */}
    <ellipse cx="18" cy="19" rx="11" ry="8.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
    {/* Tail Fin */}
    <path d="M7 19L2 14L4 19L2 24Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.8" />
    {/* Big Blank Eye */}
    <circle cx="24" cy="17" r="3.2" fill="#ffffff" stroke="#b91c1c" strokeWidth="0.8" />
    <circle cx="24" cy="17" r="1.2" fill="#18181b" />
    {/* Pouty Pink Lips */}
    <ellipse cx="28.5" cy="21" rx="2" ry="1.5" fill="#fda4af" stroke="#b91c1c" strokeWidth="0.8" />
    {/* Long Whiskers */}
    <path d="M22 23C20 28 14 27 12 31" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
  </svg>
);

// 12. Lapras - Transport Pokémon (Gentle sea lapras, blue shell horns, ocean crest)
const LaprasSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Bumpy Gray Shell Behind */}
    <path d="M11 22C11 16 25 16 25 22C25 28 11 28 11 22Z" fill="#64748b" stroke="#334155" strokeWidth="0.8" />
    <circle cx="15" cy="22" r="1.5" fill="#94a3b8" />
    <circle cx="21" cy="22" r="1.5" fill="#94a3b8" />
    {/* Curled Shell Ears */}
    <path d="M9 13C7 11 8 8 11 9C12 11 10 13 9 13Z" fill="#0284c7" stroke="#0369a1" strokeWidth="0.6" />
    <path d="M27 13C29 11 28 8 25 9C24 11 26 13 27 13Z" fill="#0284c7" stroke="#0369a1" strokeWidth="0.6" />
    {/* Head & Neck */}
    <path d="M14 12C14 8 22 8 22 12C22 17 21 24 18 25C15 24 14 17 14 12Z" fill="#06b6d4" stroke="#0891b2" strokeWidth="0.8" />
    {/* Forehead Horn */}
    <polygon points="17.2,10 18,6 18.8,10" fill="#64748b" />
    {/* Gentle Dark Eye */}
    <ellipse cx="18" cy="14" rx="1.5" ry="2" fill="#0f172a" />
    <circle cx="17.6" cy="13.5" r="0.5" fill="#ffffff" />
  </svg>
);

// 13. Vulpix - Fox Pokémon (Curls of fire, chestnut head, 6 plume flame tail)
const VulpixSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* 3 Iconic Fluffy Red Curls on Head */}
    <circle cx="15" cy="8" r="3" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.6" />
    <circle cx="18" cy="6" r="3.2" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.6" />
    <circle cx="21" cy="8" r="3" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.6" />
    {/* Ears */}
    <polygon points="9,14 5,8 13,11" fill="#ea580c" stroke="#c2410c" strokeWidth="0.6" />
    <polygon points="27,14 31,8 23,11" fill="#ea580c" stroke="#c2410c" strokeWidth="0.6" />
    {/* Head */}
    <circle cx="18" cy="18" r="8.5" fill="#fb7185" stroke="#e11d48" strokeWidth="0.8" />
    {/* Sly Fox Eyes */}
    <ellipse cx="14" cy="16.5" rx="1.6" ry="2.2" fill="#881337" />
    <circle cx="13.5" cy="15.8" r="0.6" fill="#ffffff" />
    <ellipse cx="22" cy="16.5" rx="1.6" ry="2.2" fill="#881337" />
    <circle cx="21.5" cy="15.8" r="0.6" fill="#ffffff" />
    {/* Tiny Nose */}
    <circle cx="18" cy="19" r="0.7" fill="#881337" />
    {/* Flame curls at bottom */}
    <path d="M12 26C14 24 22 24 24 26C25 28 20 30 18 29C16 30 11 28 12 26Z" fill="#ef4444" opacity="0.8" />
  </svg>
);

// 14. Meowth - Scratch Cat (Cream cat, brown ears, golden Koban coin)
const MeowthSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Cat Ears */}
    <path d="M10 14L4 5L14 9Z" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
    <path d="M8 12L5 7L11 9Z" fill="#f43f5e" />
    <path d="M26 14L32 5L22 9Z" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
    <path d="M28 12L31 7L25 9Z" fill="#f43f5e" />
    {/* Head */}
    <circle cx="18" cy="20" r="10" fill="#fef3c7" stroke="#d97706" strokeWidth="0.8" />
    {/* Golden Oval Koban Coin on Forehead */}
    <ellipse cx="18" cy="11" rx="3.5" ry="5" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
    <line x1="16" y1="11" x2="20" y2="11" stroke="#b45309" strokeWidth="0.8" />
    {/* Whiskers */}
    <line x1="6" y1="20" x2="11" y2="20" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
    <line x1="6" y1="23" x2="11" y2="22" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
    <line x1="30" y1="20" x2="25" y2="20" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
    <line x1="30" y1="23" x2="25" y2="22" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
    {/* Big Eyes */}
    <ellipse cx="14" cy="19" rx="2" ry="2.8" fill="#18181b" />
    <circle cx="13.5" cy="18" r="0.8" fill="#ffffff" />
    <ellipse cx="22" cy="19" rx="2" ry="2.8" fill="#18181b" />
    <circle cx="21.5" cy="18" r="0.8" fill="#ffffff" />
    {/* Smile with two fangs */}
    <path d="M15 24Q18 26.5 21 24" stroke="#78350f" strokeWidth="1" fill="none" />
  </svg>
);

// 15. Machop - Superpower Pokémon (Slate gray body, triple crest, boxing gloves)
const MachopSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Triple Head Crest */}
    <path d="M14 10L14 3L16 9" fill="#64748b" stroke="#475569" strokeWidth="0.8" />
    <path d="M18 9L18 2L19.5 9" fill="#64748b" stroke="#475569" strokeWidth="0.8" />
    <path d="M22 10L22 3L20 9" fill="#64748b" stroke="#475569" strokeWidth="0.8" />
    {/* Head */}
    <ellipse cx="18" cy="18" rx="9" ry="9.5" fill="#94a3b8" stroke="#475569" strokeWidth="0.8" />
    {/* Determined Red Eyes */}
    <path d="M12 16L16 17.5L13 18.5Z" fill="#ef4444" />
    <path d="M24 16L20 17.5L23 18.5Z" fill="#ef4444" />
    {/* Boxing Glove Fist Accent */}
    <circle cx="18" cy="27" r="5" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
    <path d="M15 27C15 25 21 25 21 27" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// 16. Geodude - Rock Pokémon (Rocky gray boulder face, stony brow, raised fists)
const GeodudeSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Left Rocky Arm */}
    <path d="M9 19C4 18 3 13 6 11C8 10 9 14 10 16" fill="#78716c" stroke="#57534e" strokeWidth="0.8" />
    {/* Right Rocky Arm */}
    <path d="M27 19C32 18 33 13 30 11C28 10 27 14 26 16" fill="#78716c" stroke="#57534e" strokeWidth="0.8" />
    {/* Boulder Head Body */}
    <polygon points="12,12 18,10 24,12 27,18 24,25 18,27 12,25 9,18" fill="#a8a29e" stroke="#57534e" strokeWidth="1" />
    {/* Slanted Angry Brows */}
    <line x1="12" y1="15" x2="16" y2="17" stroke="#44403c" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="24" y1="15" x2="20" y2="17" stroke="#44403c" strokeWidth="1.8" strokeLinecap="round" />
    {/* Eyes */}
    <circle cx="14" cy="18" r="1.2" fill="#1c1917" />
    <circle cx="22" cy="18" r="1.2" fill="#1c1917" />
    {/* Gritted Mouth */}
    <line x1="15" y1="22" x2="21" y2="22" stroke="#44403c" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// 17. Abra - Psi Pokémon (Golden fox psychic head, pointed ears, serene meditation)
const AbraSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Psychic Energy Waves */}
    <circle cx="18" cy="18" r="13.5" stroke="#818cf8" strokeWidth="1" strokeDasharray="4 2" opacity="0.7" />
    {/* Pointy Ears */}
    <polygon points="11,14 4,5 14,8" fill="#eab308" stroke="#a16207" strokeWidth="0.8" />
    <polygon points="25,14 32,5 22,8" fill="#eab308" stroke="#a16207" strokeWidth="0.8" />
    {/* Brown Armor Chest Plate */}
    <path d="M12 25C12 22 24 22 24 25L22 30L14 30Z" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
    {/* Head */}
    <polygon points="13,13 18,9 23,13 22,21 18,24 14,21" fill="#facc15" stroke="#a16207" strokeWidth="0.8" />
    {/* Serene Closed Slit Eyes */}
    <line x1="13.5" y1="17" x2="16.5" y2="18" stroke="#713f12" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="22.5" y1="17" x2="19.5" y2="18" stroke="#713f12" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// 18. Zubat - Bat Pokémon (Deep blue body, wide screeching mouth with sharp fangs, purple wings)
const ZubatSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Wings Behind */}
    <path d="M10 18C4 14 3 23 8 26C11 25 10 20 10 18Z" fill="#a855f7" stroke="#7e22ce" strokeWidth="0.8" />
    <path d="M26 18C32 14 33 23 28 26C25 25 26 20 26 18Z" fill="#a855f7" stroke="#7e22ce" strokeWidth="0.8" />
    {/* Tall Pointed Ears */}
    <polygon points="12,13 8,3 15,8" fill="#2563eb" stroke="#1d4ed8" strokeWidth="0.8" />
    <polygon points="24,13 28,3 21,8" fill="#2563eb" stroke="#1d4ed8" strokeWidth="0.8" />
    {/* Round Body */}
    <circle cx="18" cy="18" r="8" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="0.8" />
    {/* Eyeless Giant Mouth */}
    <ellipse cx="18" cy="18" rx="5.5" ry="4" fill="#0f172a" />
    {/* 4 Sharp White Fangs */}
    <polygon points="15,14 16,16 17,14" fill="#ffffff" />
    <polygon points="19,14 20,16 21,14" fill="#ffffff" />
    <polygon points="16,22 17,20 18,22" fill="#ffffff" />
  </svg>
);

// 19. Butterfree - Butterfly Pokémon (Cyan/white veined wings, ruby compound eyes, purple body)
const ButterfreeSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Large Butterfly Wings */}
    <path d="M16 16C12 7 3 9 5 18C6 24 13 23 16 19Z" fill="#cffafe" stroke="#0891b2" strokeWidth="0.8" />
    <path d="M20 16C24 7 33 9 31 18C30 24 23 23 20 19Z" fill="#cffafe" stroke="#0891b2" strokeWidth="0.8" />
    {/* Antennae */}
    <path d="M17 11C15 7 13 8 12 7" stroke="#1e1b4b" strokeWidth="1" strokeLinecap="round" fill="none" />
    <path d="M19 11C21 7 23 8 24 7" stroke="#1e1b4b" strokeWidth="1" strokeLinecap="round" fill="none" />
    {/* Indigo Body */}
    <ellipse cx="18" cy="19" rx="4" ry="7" fill="#4338ca" stroke="#312e81" strokeWidth="0.8" />
    {/* Giant Ruby Compound Eyes */}
    <ellipse cx="15.5" cy="16" rx="2" ry="2.6" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.6" />
    <circle cx="15" cy="15" r="0.7" fill="#ffffff" />
    <ellipse cx="20.5" cy="16" rx="2" ry="2.6" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.6" />
    <circle cx="20" cy="15" r="0.7" fill="#ffffff" />
  </svg>
);

// 20. Poliwag - Tadpole Pokémon (Cobalt body, white belly with crisp black spiral swirl)
const PoliwagSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Round Cobalt Blue Body */}
    <circle cx="18" cy="18" r="12" fill="#2563eb" stroke="#1d4ed8" strokeWidth="0.8" />
    {/* Big White Spiral Belly Disc */}
    <circle cx="18" cy="19" r="8" fill="#ffffff" stroke="#1d4ed8" strokeWidth="0.8" />
    {/* Crisp Whirlpool Spiral */}
    <path
      d="M18 19C18 17.5 16.5 16.5 15 17C13 18 14 21 16 22C19 23 22 21 21 18C20 14 15 13 13 16"
      stroke="#0f172a"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    {/* Big Anime Eyes on Top */}
    <circle cx="13" cy="11" r="2.2" fill="#ffffff" stroke="#1d4ed8" strokeWidth="0.6" />
    <circle cx="13" cy="11" r="1.2" fill="#0f172a" />
    <circle cx="23" cy="11" r="2.2" fill="#ffffff" stroke="#1d4ed8" strokeWidth="0.6" />
    <circle cx="23" cy="11" r="1.2" fill="#0f172a" />
    {/* Pink Pouty Lips */}
    <ellipse cx="18" cy="25.5" rx="2.5" ry="1.5" fill="#f43f5e" />
  </svg>
);

// 21. Diglett - Mole Pokémon (Brown cylindrical head emerging from stone mound, shiny pink nose)
const DiglettSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Rounded Brown Body */}
    <path d="M12 28V14C12 9 24 9 24 14V28Z" fill="#92400e" stroke="#78350f" strokeWidth="0.8" />
    {/* Dirt & Stone Mound Base */}
    <ellipse cx="18" cy="28" rx="12" ry="4.5" fill="#78716c" stroke="#57534e" strokeWidth="0.8" />
    <circle cx="10" cy="27" r="1.5" fill="#a8a29e" />
    <circle cx="26" cy="27" r="1.5" fill="#a8a29e" />
    {/* Shiny Black Bead Eyes */}
    <ellipse cx="15" cy="15" rx="1.2" ry="2" fill="#0f172a" />
    <circle cx="14.6" cy="14.2" r="0.5" fill="#ffffff" />
    <ellipse cx="21" cy="15" rx="1.2" ry="2" fill="#0f172a" />
    <circle cx="20.6" cy="14.2" r="0.5" fill="#ffffff" />
    {/* Large Shiny Pink Oval Nose */}
    <ellipse cx="18" cy="19" rx="3.5" ry="2.2" fill="#fb7185" stroke="#e11d48" strokeWidth="0.6" />
    <ellipse cx="17.2" cy="18.2" rx="1.2" ry="0.6" fill="#ffffff" opacity="0.8" />
  </svg>
);

// 22. Togepi - Spike Ball Pokémon (Ivory spiked egg shell, red & blue triangles, happy face)
const TogepiSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Spiked Egg Shell Crown Top */}
    <polygon points="9,14 11,8 14,13 18,6 22,13 25,8 27,14" fill="#fef9c3" stroke="#ca8a04" strokeWidth="0.8" />
    {/* Egg Body */}
    <ellipse cx="18" cy="21" rx="10.5" ry="10" fill="#fef9c3" stroke="#ca8a04" strokeWidth="0.8" />
    {/* Happy Crescent Eyes ^ ^ */}
    <path d="M13 16Q14.5 14 16 16" stroke="#451a03" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    <path d="M20 16Q21.5 14 23 16" stroke="#451a03" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    {/* Cheerful Open Mouth */}
    <ellipse cx="18" cy="19" rx="1.8" ry="1.2" fill="#ef4444" />
    {/* Red & Blue Geometric Egg Patterns */}
    <polygon points="12,23 15,21 14,25" fill="#ef4444" />
    <polygon points="21,22 24,24 21,26" fill="#3b82f6" />
    <polygon points="17,26 19,24 19,28" fill="#ef4444" />
    <polygon points="15,27 13,29 17,29" fill="#3b82f6" />
  </svg>
);

// 23. Rayquaza - Sky High Dragon (Emerald serpent head, golden rune circles, red fins)
const RayquazaSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    {/* Flared Aerodynamic Horns */}
    <polygon points="13,11 6,3 15,7" fill="#10b981" stroke="#047857" strokeWidth="0.8" />
    <polygon points="23,11 30,3 21,7" fill="#10b981" stroke="#047857" strokeWidth="0.8" />
    {/* Dragon Head */}
    <polygon points="13,11 18,6 23,11 25,23 18,29 11,23" fill="#10b981" stroke="#047857" strokeWidth="1" />
    {/* Golden Rune Ring Markings */}
    <circle cx="18" cy="17" r="3.2" stroke="#facc15" strokeWidth="1.5" fill="none" />
    {/* Piercing Yellow Eyes */}
    <polygon points="12,14 15,16 12,17" fill="#facc15" stroke="#b45309" strokeWidth="0.5" />
    <polygon points="24,14 21,16 24,17" fill="#facc15" stroke="#b45309" strokeWidth="0.5" />
    {/* Red Mouth Line & Black Interior */}
    <line x1="14" y1="22" x2="22" y2="22" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CREATURE_COMPONENTS: Array<React.FC<{ className?: string }>> = [
  PikachuSvg, // 0
  CharmanderSvg, // 1
  SquirtleSvg, // 2
  BulbasaurSvg, // 3
  GengarSvg, // 4
  JigglypuffSvg, // 5
  SnorlaxSvg, // 6
  MewtwoSvg, // 7
  DragoniteSvg, // 8
  EeveeSvg, // 9
  PsyduckSvg, // 10
  MagikarpSvg, // 11
  LaprasSvg, // 12
  VulpixSvg, // 13
  MeowthSvg, // 14
  MachopSvg, // 15
  GeodudeSvg, // 16
  AbraSvg, // 17
  ZubatSvg, // 18
  ButterfreeSvg, // 19
  PoliwagSvg, // 20
  DiglettSvg, // 21
  TogepiSvg, // 22
  RayquazaSvg, // 23
];

/**
 * Pure, memoized CreatureIcon component.
 * Instant zero-overhead rendering without network delays or OS-specific font variance.
 */
export const CreatureIcon: React.FC<CreatureIconProps> = React.memo(({ type, className = 'w-full h-full' }) => {
  const Component = CREATURE_COMPONENTS[type] || PikachuSvg;
  return <Component className={className} />;
});

CreatureIcon.displayName = 'CreatureIcon';
