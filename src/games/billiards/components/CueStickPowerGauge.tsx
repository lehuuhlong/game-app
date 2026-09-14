"use client";

interface CueStickPowerGaugeProps {
  power: number; // 0..1
  isAiming: boolean;
  height?: number;
}

export function CueStickPowerGauge({
  power,
  isAiming,
  height = 500,
}: CueStickPowerGaugeProps) {
  const percentage = Math.round(power * 100);
  const isCharged = isAiming && power > 0.05;
  const isNearMax = power > 0.85;

  // Cue stick physical pullback distance in pixels (max 85px down)
  const stickPullbackPx = Math.round(power * 85);

  return (
    <aside
      className="shrink-0 flex flex-col items-center justify-between rounded-2xl border border-border/80 bg-surface/95 dark:bg-slate-900/95 p-2.5 sm:p-3 shadow-xl backdrop-blur-md select-none transition-all w-16 sm:w-20"
      style={{ height }}
      aria-label="Cue stick shot power meter"
    >
      {/* ── Top: Header & Digital Readout ────────────────────────── */}
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-1">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isCharged
                ? isNearMax
                  ? "bg-rose-500 animate-ping"
                  : "bg-amber-400 animate-pulse"
                : "bg-foreground-muted/40"
            }`}
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground-muted">
            Power
          </span>
        </div>

        <div
          className={`font-mono text-sm sm:text-base font-black tracking-tight mt-0.5 transition-all ${
            percentage >= 98
              ? "text-rose-500 scale-105 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]"
              : isNearMax
              ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
              : isCharged
              ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
              : "text-foreground-secondary"
          }`}
        >
          {percentage}%
        </div>
      </div>

      {/* ── Center: Dual Track (Power Bar + Animated Cue Stick) ──── */}
      <div className="relative flex-1 w-full my-2 flex items-center justify-center gap-1 sm:gap-2">
        {/* 1. Precision Vertical Power Meter Fill */}
        <div className="relative w-2.5 sm:w-3 h-full rounded-full bg-background border border-border/70 overflow-hidden flex flex-col justify-end p-0.5 shadow-inner">
          {/* Fill track (bottom to top) */}
          <div
            className="w-full rounded-full transition-all duration-75 ease-out"
            style={{
              height: `${Math.max(power > 0 ? 4 : 0, percentage)}%`,
              background:
                power > 0.75
                  ? "linear-gradient(180deg, #ef4444, #f59e0b 50%, #10b981 100%)"
                  : power > 0.4
                  ? "linear-gradient(180deg, #f59e0b, #10b981 100%)"
                  : "linear-gradient(180deg, #10b981, #059669 100%)",
              boxShadow: isCharged
                ? `0 0 10px ${power > 0.75 ? "rgba(239, 68, 68, 0.7)" : "rgba(16, 185, 129, 0.7)"}`
                : "none",
            }}
          />
        </div>

        {/* 2. Calibration Tick Marks */}
        <div className="flex flex-col justify-between h-full py-1 text-[8px] font-mono text-foreground-muted/60 font-semibold select-none">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>

        {/* 3. Authentic Vertical Cue Stick Graphic (Pulls down dynamically) */}
        <div className="relative w-4 sm:w-5 h-full flex flex-col items-center overflow-hidden">
          {/* Static striking contact point (cue ball at top) */}
          <div className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300 shadow-xs flex-shrink-0 flex items-center justify-center mb-1 z-10">
            <div className="w-1 h-1 rounded-full bg-red-500" />
          </div>

          {/* Cue Stick Assembly with dynamic pullback translate */}
          <div
            className="relative flex-1 w-full flex flex-col items-center transition-transform duration-75 ease-out"
            style={{
              transform: `translateY(${stickPullbackPx}px)`,
            }}
          >
            {/* Blue Chalk Tip */}
            <div
              className={`w-2 h-1.5 rounded-t-xs transition-colors ${
                isCharged ? "bg-sky-400 shadow-[0_0_6px_#38bdf8]" : "bg-sky-600"
              }`}
            />
            {/* White Ivory Ferrule */}
            <div className="w-2.5 h-2 bg-slate-100 border-x border-slate-300" />
            {/* Brass Joint Ring */}
            <div className="w-2.5 h-1 bg-amber-400" />
            {/* Maple Shaft (Tapered wood gradient) */}
            <div
              className="w-2.5 flex-1 min-h-[90px] border-x border-amber-950/20"
              style={{
                background: "linear-gradient(90deg, #d4a373 0%, #faedcd 45%, #d4a373 100%)",
              }}
            />
            {/* Irish Linen Wrap (Grip section) */}
            <div
              className="w-3 h-20 border-x border-slate-900/40 rounded-xs"
              style={{
                background:
                  "repeating-linear-gradient(45deg, #1e293b, #1e293b 2px, #334155 2px, #334155 4px)",
              }}
            />
            {/* Dark Mahogany Butt & Rubber Bumper */}
            <div
              className="w-3.5 h-16 border-x border-amber-950/40"
              style={{
                background: "linear-gradient(90deg, #451a03 0%, #78350f 50%, #451a03 100%)",
              }}
            />
            <div className="w-3 h-2 rounded-b-sm bg-slate-950 border border-slate-800" />
          </div>
        </div>
      </div>

      {/* ── Bottom: Guidance Prompt ──────────────────────────────── */}
      <div className="text-center pt-1 border-t border-border/60 w-full">
        <span className="text-[9px] font-bold uppercase tracking-wider text-foreground-muted block">
          {isCharged ? "Release" : "Pull Cue"}
        </span>
      </div>
    </aside>
  );
}
