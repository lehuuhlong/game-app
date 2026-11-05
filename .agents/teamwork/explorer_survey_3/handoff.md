# Survey Investigation Report: Audio Safety, Score Submission & Anti-Cheat, Registration Checklist, and Build Verification

**Agent**: Explorer 3 (Survey Phase)  
**Target Game**: Neon Nonogram (`src/games/nonogram/`)  
**Timestamp**: 2026-11-05T14:13:00Z  

---

## 1. Observation

### A. Web Audio Synthesis Safety (`src/games/nonogram/sounds.ts`)

1. **Mute Desynchronization on Page Reload**:
   - In `src/games/nonogram/sounds.ts`:
     - Line 7: `let isMuted = false;`
     - Lines 36–45: `getMuted(): boolean` reads `localStorage.getItem('nonogram-sound-muted') === 'true'`.
     - Lines 48, 74, 97, 120, 146, 172, 195: Every sound function starts with `if (isMuted) return;`.
   - In `src/games/nonogram/GameNonogram.tsx`:
     - Line 17: `const [isMuted, setIsMuted] = useState(Sounds.getMuted());`
   - **Observation**: If a player has previously muted sound in a prior session, `localStorage` holds `'true'`. Upon page reload, `GameNonogram.tsx` sets its React state `isMuted` to `true` (sound icon shows muted), but `sounds.ts`'s module variable `isMuted` initializes to `false`. Because all sound functions check `if (isMuted) return;` rather than `if (getMuted()) return;`, sound effects still trigger when the user clicks cells.

2. **Zero Audio Node Disconnections (Memory & Audio Graph Leak)**:
   - In `src/games/nonogram/sounds.ts`:
     - Lines 66–69 (`playFillSound`):
       ```ts
       osc.connect(gain);
       gain.connect(ctx.destination);
       osc.start(now);
       osc.stop(now + 0.09);
       ```
     - Lines 89–92 (`playCrossSound`), 112–115 (`playMistakeSound`), 137–141 (`playLineCompleteSound`), 163–167 (`playHintSound`), 187–191 (`playUndoSound`), 212–216 (`playVictorySound`).
   - **Observation**: Neither `osc.disconnect()` nor `gain.disconnect()` is ever called in any of the 7 audio synthesis functions. In a 10x10 or 15x15 board (up to 225 cells), rapid dragging and filling leaves hundreds of stopped `GainNode` and `OscillatorNode` instances permanently bound to `ctx.destination` and held in memory.

3. **Unhandled Promise Rejection on `audioCtx.resume()`**:
   - In `src/games/nonogram/sounds.ts` lines 19–21:
     ```ts
     if (audioCtx && audioCtx.state === 'suspended') {
       audioCtx.resume();
     }
     ```
   - **Observation**: `audioCtx.resume()` returns a Promise. When invoked before a recognized browser gesture or when suspended by browser power policy, an unhandled promise rejection occurs because there is no `.catch()` handler.

4. **Audio Transient Clicking / Waveform Popping**:
   - In `src/games/nonogram/sounds.ts`:
     - Line 63 (`playFillSound`): `gain.gain.setValueAtTime(0.18, now);`
     - Line 110 (`playMistakeSound`): `gain.gain.setValueAtTime(0.25, now);`
     - Line 108 (`playMistakeSound`): `osc.frequency.setValueAtTime(95, now + 0.08);` (instant frequency discontinuity from 130 Hz).
     - Lines 129, 134–135 (`playLineCompleteSound`), 156, 160–161 (`playHintSound`), 204, 209–210 (`playVictorySound`): Polyphonic chord loops schedule future oscillators at `start = now + idx * delay`. The `gain` node is created at `now` (defaulting to gain 1.0) and connected to `ctx.destination`. Only at `start` is `setValueAtTime` called, causing volume jumping.
     - Release cuts: All functions ramp down to `0.001` (`exponentialRampToValueAtTime(0.001, stopTime)`) and immediately stop, abruptly snapping from non-zero amplitude to zero, resulting in subtle audible clicks.

---

### B. Score Submission & Anti-Cheat Pipeline

1. **HTTP Method Mismatch: POST vs PATCH (HTTP 405 Method Not Allowed)**:
   - In `src/games/nonogram/GameNonogram.tsx` lines 125–135:
     ```ts
     if (user?.id) {
       await fetch(`/api/users/${user.id}/score`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           game: 'nonogram',
           score,
           sessionToken,
         }),
       });
     }
     ```
   - In `src/app/api/users/[id]/score/route.ts` line 50:
     ```ts
     export async function PATCH(
       request: Request,
       { params }: { params: Promise<{ id: string }> }
     ) {
     ```
   - **Observation**: `src/app/api/users/[id]/score/route.ts` defines ONLY an HTTP `PATCH` endpoint. No `POST` handler exists. When a player wins and submits their score, Next.js returns `405 Method Not Allowed`. The score is never written to MongoDB!

2. **False Positive Anti-Cheat Rejection on Hard Difficulty Scores (> 1500)**:
   - In `src/lib/gameSecurity.ts` lines 216–226:
     ```ts
     case 'nonogram': {
       // Neon Nonogram:
       if (score > 100 && durationSeconds < 3) {
         return { valid: false, reason: 'Duration too short for Nonogram puzzle completion' };
       }
       if (score > 1500) {
         return { valid: false, reason: 'Nonogram score exceeds maximum realistic threshold' };
       }
       return { valid: true };
     }
     ```
   - In `src/games/nonogram/useNonogramEngine.ts` lines 133–139:
     ```ts
     const basePoints = puzzle.difficulty === 'EASY' ? 100 : puzzle.difficulty === 'MEDIUM' ? 300 : 600;
     const targetTime = puzzle.difficulty === 'EASY' ? 90 : puzzle.difficulty === 'MEDIUM' ? 240 : 480;
     const timeBonus = Math.max(0, Math.floor((targetTime - currentTimer) * 1.5));
     const mistakeBonus = currentMistakes === 0 ? 150 : currentMistakes === 1 ? 50 : 0;
     const hintBonus = hints === 0 ? 100 : 0;

     const totalScore = basePoints + timeBonus + mistakeBonus + hintBonus;
     ```
   - **Observation**: On HARD difficulty, `basePoints = 600`. A fast solve in 20 seconds gives `timeBonus = Math.floor((480 - 20) * 1.5) = 690`. With 0 mistakes (`mistakeBonus = 150`) and 0 hints (`hintBonus = 100`), the legitimate calculated score is `600 + 690 + 150 + 100 = 1540` (and theoretical max is `1570`). Because `src/lib/gameSecurity.ts` caps scores at 1500, legitimate high scores between 1501 and 1570 are rejected by the server with `{ valid: false, reason: 'Nonogram score exceeds maximum realistic threshold' }`.

3. **Stale Session Token Reused on Subsequent Puzzles (HTTP 409 Conflict)**:
   - In `src/games/nonogram/GameNonogram.tsx`:
     - Lines 53–56:
       ```ts
       useEffect(() => {
         startSession(user?.id, user?.username);
       }, [startSession, user?.id, user?.username]);
       ```
     - Lines 58–63:
       ```ts
       // Restart session when status moves from READY to PLAYING
       useEffect(() => {
         if (status === 'PLAYING') {
           scoreSavedRef.current = false;
         }
       }, [status]);
       ```
     - Lines 150–167 (`handleNextPuzzle`): calls `selectPuzzle(...)` without requesting a new session.
   - In `src/lib/gameSession.ts` lines 174–188:
     ```ts
     if (action === "match" && existing.matchSubmitted) {
       return { valid: false, error: "Match has already been recorded for this game session", status: 409 };
     }
     ```
   - **Observation**: When a user wins puzzle #1, the single session token minted on mount is marked `matchSubmitted: true` and `scoreSubmitted: true` in MongoDB. When the player clicks "Next Puzzle" or restarts, a fresh session is NEVER requested (`startSession(..., true)` is never called). When puzzle #2 is solved, the already-consumed session token is submitted, resulting in HTTP 409 Conflict. No subsequent puzzles can ever record matches or scores without a full page reload!

4. **Missing Score Update Duration & Missing Client Profile Refresh**:
   - In `src/games/nonogram/GameNonogram.tsx` line 13: `const { user } = useAuth();` (does not destructure `refreshUser`).
   - Lines 126–134: Payload sent to `/api/users/${user.id}/score` does not include `duration: elapsed || timer`.
   - **Observation**: Other portal games send `duration` to `/api/users/[id]/score` and invoke `refreshUser({ bestScoreNonogram: d.bestScoreNonogram })` upon completion so the portal header score updates in real time.

5. **Nonogram Missing from `isPuzzleOrLongGame` in Score Route**:
   - In `src/app/api/users/[id]/score/route.ts` lines 105–110:
     ```ts
     const isProgressiveGame = game === 'pikachu' || game === '2048';
     const isPuzzleOrLongGame =
       isProgressiveGame ||
       game === 'minesweeper' ||
       game === 'sudoku' ||
       game === 'line98';
     ```
   - **Observation**: Nonogram is a deduction puzzle where time varies naturally. It should be included in `isPuzzleOrLongGame` so `elapsedSeconds` takes `Math.max(sessionVerification.elapsedSeconds || 0, reportedDuration)` rather than strictly server session time.

---

### C. 7-Point Project Registration Checklist Verification

| Step | Requirement | Location | Status | Details |
|---|---|---|---|---|
| 1 | Implementation Folder | `src/games/nonogram/` | PASS | `types.ts`, `useNonogramEngine.ts`, `sounds.ts`, `GameNonogram.tsx`, `index.ts`, `puzzles.ts` present. |
| 2 | Next.js App Route | `src/app/games/nonogram/page.tsx` | PASS | Route present, metadata configured, imports `GameNonogram`. |
| 3 | Vector Thumbnail | `public/games/nonogram/thumbnail.svg` | PASS | 384x224 SVG present with proper dark neon palette. |
| 4 | Game Registry | `src/config/games.ts:232-243` | PASS | Registered in `GAMES` with title, description, tags, gradient. |
| 5a | Completed Game ID | `src/app/page.tsx:58` | PASS | Present in `COMPLETED_GAME_IDS`. |
| 5b | Estimated Duration | `src/app/games/page.tsx:25-43` | **FAIL** | `'nonogram'` is MISSING from `GAME_DURATIONS`. Defaults to generic fallback `'5–15m'`. |
| 5c | Estimated Duration 3D | `src/components/landing/GameCard3D.tsx:19-36` | **FAIL** | `'nonogram'` is MISSING from `GAME_DURATIONS`. |
| 5d | SVG Icons | `src/components/landing/GameIcons.tsx:431, 497` | PASS | `NonogramIcon` and switch case in `getGameSvgIcon` present. |
| 5e | Bento Animated Graphic | `src/components/landing/GameVisualGraphic.tsx:1533` | PASS | `id === 'nonogram'` present with neon heart pixel graphic. |
| 5f | Daily Spotlight | `src/components/landing/DailySpotlight.tsx:30` | PASS | Present with challenge goal and +250 XP reward. |
| 6a | Anti-Cheat Threshold | `src/lib/gameSecurity.ts:216` | **PARTIAL** | Registered, but score cap (1500) rejects legitimate Hard scores. |
| 6b | User Score API | `src/app/api/users/[id]/score/route.ts:35, 301, 347` | **PARTIAL** | Schema & fields present, but `GameNonogram.tsx` calls wrong HTTP method (POST instead of PATCH). |
| 7 | Multiplayer Server | `socket-server/` | N/A | Single player game (`minPlayers: 1, maxPlayers: 1`). |

---

### D. Build & Typecheck Verification

- **Command**: `npx tsc --noEmit`  
  **Result**: Exited with code 0. Zero TypeScript compilation or type errors.
- **Command**: `npm run build`  
  **Result**: Exited with code 0. Next.js 16.2.4 (Turbopack) production build completed successfully. All 34 static and dynamic routes compiled, including `/games/nonogram`.

---

## 2. Logic Chain

1. **Audio Mute Failure**:
   - `sounds.ts` has module state `let isMuted = false` (Obs A.1).
   - `GameNonogram.tsx` loads stored preference via `Sounds.getMuted()` into React state, but does not update `sounds.ts`'s module variable `isMuted` on mount.
   - When a user interacts with the board, audio methods evaluate `if (isMuted) return;` which reads the in-memory variable `false`.
   - *Conclusion*: Audio plays despite user's previously saved muted setting.

2. **Web Audio Memory Leak**:
   - Every audio trigger constructs an `OscillatorNode` and `GainNode`, connecting them to `ctx.destination` (Obs A.2).
   - In Nonograms, users drag across tens or hundreds of cells in a single puzzle run.
   - Because `.disconnect()` is never called, the Web Audio graph accumulates orphaned audio nodes, wasting memory and resources.
   - *Conclusion*: Audio nodes must be disconnected upon completion via `osc.onended`.

3. **Audio Transient Artifacts**:
   - Instant step changes in amplitude (e.g. from 0 to 0.18 or 0.25) create high-frequency click transients (Obs A.4).
   - Stopping an oscillator when gain is at 0.001 snaps the audio signal abruptly to 0.
   - *Conclusion*: A 3–5ms micro-attack ramp and a clean linear ramp to 0 before node stop will eliminate audible clicks.

4. **Score Submission Broken (HTTP 405)**:
   - `GameNonogram.tsx` issues `fetch('/api/users/${user.id}/score', { method: 'POST', ... })` (Obs B.1).
   - `src/app/api/users/[id]/score/route.ts` only exports `export async function PATCH(...)`.
   - The browser receives HTTP 405 Method Not Allowed and the catch block logs an error without updating the database.
   - *Conclusion*: The fetch call in `GameNonogram.tsx` must be updated to `method: 'PATCH'`.

5. **False Positive Anti-Cheat Block**:
   - `gameSecurity.ts` rejects any score where `score > 1500` (Obs B.2).
   - The game's scoring logic awards up to 1570 points on Hard difficulty (600 base + 720 time + 150 mistake + 100 hint).
   - A fast, flawless Hard solve will routinely reach 1525–1540 points.
   - *Conclusion*: The score limit in `src/lib/gameSecurity.ts` must be raised to at least 2000.

6. **Broken Multi-Puzzle Progression (HTTP 409)**:
   - A cryptographic session token can only be consumed once per action (`match` and `score`) (Obs B.3).
   - `GameNonogram.tsx` mints a token only on mount and never calls `startSession(..., true)` when starting new puzzles.
   - The second puzzle solve submits the consumed token, triggering an HTTP 409 rejection.
   - *Conclusion*: `GameNonogram.tsx` must force a fresh session token (`startSession(..., true)`) whenever a new puzzle is started or restarted.

7. **Incomplete 7-Point Registration**:
   - `GAME_DURATIONS` in `src/app/games/page.tsx` and `src/components/landing/GameCard3D.tsx` lacks `'nonogram'` (Obs C).
   - *Conclusion*: Adding `'nonogram': '3–10m'` satisfies Step 5 of the architectural checklist.

---

## 3. Caveats

1. **Board Interaction & Mobile Touch Events**:
   - This investigation focused on Web Audio safety, anti-cheat, registration, and build status per the dispatch assignment. Detailed gesture handling, cell drag-fill state synchronization, and touch scrolling interference on mobile are primarily audited by Explorer 2.
2. **Action Log Security**:
   - `gameSecurity.ts` does not currently mandate an `actionLog` for Nonogram (unlike `line98` and `flappybird`). This is acceptable for single-player puzzle games where rate-of-score and duration checks are sufficient, but adding move count consistency in the future could provide extra protection.

---

## 4. Conclusion

Neon Nonogram has solid visual foundations and passes all build and typecheck verifications cleanly. However, it contains **three critical bugs** that directly prevent score submission and produce audio leaks:
1. **Critical Blocker**: HTTP 405 on score submission (`POST` instead of `PATCH` in `GameNonogram.tsx`).
2. **Critical Blocker**: Legitimate Hard mode scores (> 1500 up to 1570) are rejected as cheats by `src/lib/gameSecurity.ts`.
3. **Critical Blocker**: Session token reuse causes HTTP 409 on every puzzle after the first.
4. **Audio Bugs**: AudioContext mute state desync, unhandled `resume()` rejection, missing node disconnects (memory leak), and audio click transients.
5. **Registration Gaps**: Missing duration mapping in `src/app/games/page.tsx` and `src/components/landing/GameCard3D.tsx`.

---

## 5. Verification Method

### How to independently verify findings:

1. **Verify TypeScript & Build**:
   ```powershell
   npx tsc --noEmit
   npm run build
   ```
   Both commands should exit with code 0.

2. **Verify Route Method Mismatch**:
   - Inspect `src/app/api/users/[id]/score/route.ts:50` (confirm only `export async function PATCH` is exported).
   - Inspect `src/games/nonogram/GameNonogram.tsx:127` (confirm `method: 'POST'` is used).

3. **Verify Anti-Cheat Threshold Defect**:
   - Inspect `src/lib/gameSecurity.ts:222` (`if (score > 1500)`).
   - Inspect `src/games/nonogram/useNonogramEngine.ts:133-139` (Hard base: 600 + max time bonus: 720 + mistake bonus: 150 + hint bonus: 100 = 1570 > 1500).

4. **Verify Audio Disconnects & Mute Logic**:
   - Inspect `src/games/nonogram/sounds.ts:7, 48-70, 89-92`.
   - Confirm lack of `osc.onended` / `disconnect()` calls.
   - Confirm `isMuted` module variable is checked instead of `getMuted()`.

5. **Verify 7-Point Duration Map Gaps**:
   - Inspect `src/app/games/page.tsx:25-43` and `src/components/landing/GameCard3D.tsx:19-36`.
   - Confirm `'nonogram'` key is missing.

---

## 6. Concrete Fix Recommendations (Diff Snippets)

### Fix 1: `src/games/nonogram/sounds.ts`
```diff
-let isMuted = false;
+let isMuted: boolean | null = null;

 function getAudioContext(): AudioContext | null {
   if (typeof window === 'undefined') return null;
   if (!audioCtx) {
     const AudioContextClass =
       window.AudioContext ||
       (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
     if (AudioContextClass) {
       audioCtx = new AudioContextClass();
     }
   }
   if (audioCtx && audioCtx.state === 'suspended') {
-    audioCtx.resume();
+    audioCtx.resume().catch(() => {});
   }
   return audioCtx;
 }

 export function getMuted(): boolean {
   if (typeof window !== 'undefined') {
     try {
       return localStorage.getItem('nonogram-sound-muted') === 'true';
     } catch {
       return false;
     }
   }
-  return isMuted;
+  return isMuted ?? false;
 }

+function isAudioMuted(): boolean {
+  if (isMuted === null) {
+    isMuted = getMuted();
+  }
+  return isMuted;
+}

 export function playFillSound(combo = 1) {
-  if (isMuted) return;
+  if (isAudioMuted()) return;
   const ctx = getAudioContext();
   if (!ctx) return;

   const now = ctx.currentTime;
   const baseFreq = 480 * Math.min(2.0, 1 + (combo - 1) * 0.1);

   const osc = ctx.createOscillator();
   const gain = ctx.createGain();

   osc.type = 'sine';
   osc.frequency.setValueAtTime(baseFreq, now);
   osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

-  gain.gain.setValueAtTime(0.18, now);
+  gain.gain.setValueAtTime(0.0001, now);
+  gain.gain.linearRampToValueAtTime(0.18, now + 0.005);
   gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
+  gain.gain.linearRampToValueAtTime(0, now + 0.095);

   osc.connect(gain);
   gain.connect(ctx.destination);
+  osc.onended = () => {
+    try {
+      osc.disconnect();
+      gain.disconnect();
+    } catch {}
+  };
   osc.start(now);
-  osc.stop(now + 0.09);
+  osc.stop(now + 0.095);
 }
```
*(Apply similar disconnect and micro-ramp pattern to all other 6 sound functions)*

### Fix 2: `src/lib/gameSecurity.ts`
```diff
     case 'nonogram': {
       // Neon Nonogram:
       // Minimum duration: solving any puzzle requires at least 3 seconds of human deduction
       if (score > 100 && durationSeconds < 3) {
         return { valid: false, reason: 'Duration too short for Nonogram puzzle completion' };
       }
-      if (score > 1500) {
+      if (score > 2000) {
         return { valid: false, reason: 'Nonogram score exceeds maximum realistic threshold' };
       }
       return { valid: true };
     }
```

### Fix 3: `src/games/nonogram/GameNonogram.tsx`
```diff
-  const { user } = useAuth();
+  const { user, refreshUser } = useAuth();
   const { startSession, ensureSessionToken, getElapsedDuration } = useGameSession('nonogram');
...
   // Restart session when status moves from READY to PLAYING
   useEffect(() => {
     if (status === 'PLAYING') {
       scoreSavedRef.current = false;
+      startSession(user?.id, user?.username, true);
     }
-  }, [status]);
+  }, [status, startSession, user?.id, user?.username]);
...
         if (user?.id) {
-          await fetch(`/api/users/${user.id}/score`, {
-            method: 'POST',
+          const res = await fetch(`/api/users/${user.id}/score`, {
+            method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               game: 'nonogram',
               score,
               sessionToken,
+              duration: elapsed || timer,
             }),
           });
+          if (res.ok) {
+            const d = await res.json();
+            if (d.bestScoreNonogram !== undefined && refreshUser) {
+              refreshUser({ bestScoreNonogram: d.bestScoreNonogram });
+            }
+          }
         }
...
   const handleNextPuzzle = () => {
+    startSession(user?.id, user?.username, true);
     const currentIndex = availablePuzzles.findIndex((p) => p.id === currentPuzzle.id);
...
   const handleRestart = () => {
+    startSession(user?.id, user?.username, true);
     restart();
   };
```

### Fix 4: `src/app/api/users/[id]/score/route.ts`
```diff
     const isProgressiveGame = game === 'pikachu' || game === '2048';
     const isPuzzleOrLongGame =
       isProgressiveGame ||
       game === 'minesweeper' ||
       game === 'sudoku' ||
-      game === 'line98';
+      game === 'line98' ||
+      game === 'nonogram';
```

### Fix 5: `src/app/games/page.tsx` & `src/components/landing/GameCard3D.tsx`
```diff
 const GAME_DURATIONS: Record<string, string> = {
...
   'blockdrop': '2–10m',
   'eggpop': '3–10m',
+  'nonogram': '3–10m',
 };
```
