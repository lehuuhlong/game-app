"use client";

import { BALL_CONFIGS } from "../constants";

interface BallSphereProps {
  number: number;
  size?: number;
  className?: string;
  glow?: boolean;
}

export function BallSphere({
  number,
  size = 28,
  className = "",
  glow = false,
}: BallSphereProps) {
  const cfg = BALL_CONFIGS[number];
  if (!cfg) return null;

  const isStripe = cfg.type === "stripe" && cfg.stripeColor;
  const isEight = number === 8;
  const isCue = number === 0;

  return (
    <div
      className={`relative rounded-full select-none flex-shrink-0 transition-transform duration-200 hover:scale-110 ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: glow
          ? "0 0 12px rgba(16, 185, 129, 0.6), 0 4px 8px rgba(0, 0, 0, 0.4)"
          : "0 3px 6px rgba(0, 0, 0, 0.45), inset 0 -2px 4px rgba(0,0,0,0.4)",
      }}
      title={`Ball ${number} (${cfg.type})`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="w-full h-full rounded-full overflow-hidden"
      >
        <defs>
          {/* Specular 3D spherical shading */}
          <radialGradient id={`ball-glare-${number}`} cx="32%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="25%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="65%" stopColor="#000000" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>

          {/* Ball base gradient */}
          <radialGradient id={`ball-base-${number}`} cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor={isStripe ? "#ffffff" : isEight ? "#374151" : cfg.color} />
            <stop offset="100%" stopColor={isStripe ? "#cbd5e1" : isEight ? "#111827" : cfg.color} />
          </radialGradient>
        </defs>

        {/* Base Sphere */}
        <circle cx="16" cy="16" r="15" fill={`url(#ball-base-${number})`} />

        {/* Stripe band (for balls 9-15) */}
        {isStripe && (
          <g>
            <clipPath id={`stripe-clip-${number}`}>
              <circle cx="16" cy="16" r="15" />
            </clipPath>
            <rect
              x="0"
              y="7.5"
              width="32"
              height="17"
              fill={cfg.stripeColor}
              clipPath={`url(#stripe-clip-${number})`}
            />
          </g>
        )}

        {/* Center Number Circle */}
        {!isCue && (
          <>
            <circle cx="16" cy="16" r="6.8" fill="#ffffff" />
            <circle cx="16" cy="16" r="6.8" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" fill="none" />
            <text
              x="16"
              y="19"
              fontSize={number >= 10 ? "8" : "9.5"}
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
              fill="#0f172a"
            >
              {number}
            </text>
          </>
        )}

        {/* Gloss Overlay */}
        <circle cx="16" cy="16" r="15" fill={`url(#ball-glare-${number})`} />

        {/* Top-left sharp glint dot */}
        <ellipse cx="11" cy="10" rx="3" ry="1.8" transform="rotate(-30 11 10)" fill="#ffffff" opacity="0.65" />
      </svg>
    </div>
  );
}
