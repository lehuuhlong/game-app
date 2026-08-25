"use client";

import { useFlappyBird } from "./useFlappyBird";

export function GameFlappyBird() {
  const { canvasRef, gameState, startGame, flap, config } = useFlappyBird();

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-sky-500">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Endless arcade
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Flappy Bird
          </h1>
          <p className="mt-1 text-sm text-foreground-secondary">
            Bay qua khe ống, giữ nhịp và phá kỷ lục của bạn.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="min-w-20 rounded-xl border border-border bg-surface px-4 py-2 text-center shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">Điểm</div>
            <div className="text-xl font-black tabular-nums text-foreground">{gameState.score}</div>
          </div>
          <div className="min-w-20 rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-2 text-center shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Kỷ lục</div>
            <div className="text-xl font-black tabular-nums text-amber-600 dark:text-amber-400">{gameState.highScore}</div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-3 text-xs text-foreground-muted">
        <div className="flex flex-wrap items-center gap-2">
          <kbd className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-[10px] text-foreground-secondary">Space</kbd>
          <kbd className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-[10px] text-foreground-secondary">↑</kbd>
          <span>hoặc chạm để bay</span>
        </div>
        <button
          type="button"
          onClick={startGame}
          className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 font-semibold text-foreground-secondary transition hover:-translate-y-0.5 hover:bg-surface-hover hover:text-foreground"
        >
          Chơi lại
        </button>
      </div>

      <div className="relative w-full max-w-[480px] overflow-hidden rounded-[28px] border-4 border-slate-900/80 bg-sky-300 shadow-2xl shadow-sky-500/15">
        <canvas
          ref={canvasRef}
          width={config.canvasWidth}
          height={config.canvasHeight}
          onPointerDown={(event) => {
            event.preventDefault();
            flap();
          }}
          className="block h-auto w-full cursor-pointer touch-none select-none"
          aria-label="Flappy Bird game canvas"
        />

        {!gameState.isPlaying && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/10 p-6 backdrop-blur-[1px]">
            <div className="pointer-events-auto w-full max-w-[280px] rounded-3xl border border-white/50 bg-slate-950/80 p-5 text-center text-white shadow-2xl backdrop-blur-md">
              {gameState.isGameOver ? (
                <>
                  <div className="text-xs font-bold uppercase tracking-[0.24em] text-rose-300">Game over</div>
                  <div className="mt-2 text-5xl font-black tabular-nums">{gameState.score}</div>
                  <p className="mt-1 text-xs text-slate-300">Kỷ lục: {gameState.highScore}</p>
                </>
              ) : (
                <>
                  <div className="text-5xl" aria-hidden="true">🐤</div>
                  <h2 className="mt-2 text-2xl font-black">Sẵn sàng bay?</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">Mỗi lần nhấn sẽ giúp chú chim vỗ cánh bay lên.</p>
                </>
              )}
              <button
                type="button"
                onClick={startGame}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-black text-amber-950 shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:from-amber-300 hover:to-orange-400"
              >
                <span aria-hidden="true">▶</span>
                {gameState.isGameOver ? "Bay lại" : "Bắt đầu"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid w-full max-w-[680px] gap-3 sm:grid-cols-3">
        {[
          ["01", "Giữ nhịp", "Đừng nhấn liên tục — hãy để chim rơi nhẹ trước khi vỗ cánh."],
          ["02", "Nhìn về phía trước", "Tập trung vào khe ống tiếp theo thay vì chỉ nhìn chú chim."],
          ["03", "Càng xa càng khó", "Tốc độ tăng và khe ống hẹp dần theo điểm số."],
        ].map(([number, title, copy]) => (
          <div key={number} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="font-mono text-xs font-black text-sky-500">{number}</div>
            <h3 className="mt-1 text-sm font-bold text-foreground">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-foreground-muted">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

