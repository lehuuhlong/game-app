/**
 * Empirical Stress-Testing Harness for Neon Nonogram Web Audio Synthesis
 *
 * Evaluates:
 * - Suite 1: 200+ Rapid Burst Triggers & Audio Graph Node Disconnection/Leak Check
 * - Suite 2: Autoplay Policies, Suspended States & Unhandled Rejection Absorption
 * - Suite 3: Numerical Edge Cases (Combos, Extreme / Negative Values, NaNs)
 * - Suite 4: Envelope Safety & Audio Transient / Click Prevention (F15)
 * - Suite 5: Mute State Synchronization across Storage & Memory Lifecycles (F12)
 *
 * Run with: npx tsx src/games/nonogram/soundsStress.test.ts
 */

interface TrackedConnection {
  source: any;
  destination: any;
  disconnected: boolean;
}

class MockAudioParam {
  name: string;
  value: number;
  events: Array<{ type: string; value: number; time: number }>;

  constructor(name: string, initialValue = 0) {
    this.name = name;
    this.value = initialValue;
    this.events = [];
  }

  setValueAtTime(value: number, time: number) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Failed to execute 'setValueAtTime' on 'AudioParam': The provided float value (${value}) is not a finite number.`);
    }
    if (!Number.isFinite(time) || time < 0) {
      throw new RangeError(`Failed to execute 'setValueAtTime' on 'AudioParam': The time provided (${time}) must be non-negative.`);
    }
    this.value = value;
    this.events.push({ type: 'setValueAtTime', value, time });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Failed to execute 'linearRampToValueAtTime' on 'AudioParam': The provided float value (${value}) is not a finite number.`);
    }
    if (!Number.isFinite(time) || time < 0) {
      throw new RangeError(`Failed to execute 'linearRampToValueAtTime' on 'AudioParam': The time provided (${time}) must be non-negative.`);
    }
    this.value = value;
    this.events.push({ type: 'linearRampToValueAtTime', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Failed to execute 'exponentialRampToValueAtTime' on 'AudioParam': The provided float value (${value}) is not a finite number.`);
    }
    // W3C Web Audio API Spec Section 4.4.4:
    // It is an error if value is less than or equal to zero.
    if (value <= 0) {
      throw new RangeError(`Failed to execute 'exponentialRampToValueAtTime' on 'AudioParam': The float target value provided (${value}) must be a non-zero positive real number.`);
    }
    if (!Number.isFinite(time) || time < 0) {
      throw new RangeError(`Failed to execute 'exponentialRampToValueAtTime' on 'AudioParam': The time provided (${time}) must be non-negative.`);
    }
    this.value = value;
    this.events.push({ type: 'exponentialRampToValueAtTime', value, time });
    return this;
  }
}

class MockAudioNode {
  ctx: MockAudioContext;
  outgoingConnections: TrackedConnection[] = [];

  constructor(ctx: MockAudioContext) {
    this.ctx = ctx;
    ctx.allNodes.push(this);
  }

  connect(destination: any) {
    const conn: TrackedConnection = {
      source: this,
      destination,
      disconnected: false,
    };
    this.outgoingConnections.push(conn);
    this.ctx.activeConnections.add(conn);
    return destination;
  }

  disconnect() {
    for (const conn of this.outgoingConnections) {
      conn.disconnected = true;
      this.ctx.activeConnections.delete(conn);
    }
  }
}

class MockOscillatorNode extends MockAudioNode {
  type: string = 'sine';
  frequency: MockAudioParam;
  onended: (() => void) | null = null;
  started: boolean = false;
  stopped: boolean = false;
  startTime: number = 0;
  stopTime: number = 0;

  constructor(ctx: MockAudioContext) {
    super(ctx);
    this.frequency = new MockAudioParam('frequency', 440);
    ctx.allOscillators.push(this);
  }

  start(when = 0) {
    if (this.started) throw new Error('Oscillator already started');
    this.started = true;
    this.startTime = when;
  }

  stop(when = 0) {
    if (this.stopped) throw new Error('Oscillator already stopped');
    this.stopped = true;
    this.stopTime = when;
    this.ctx.scheduledStops.push({
      time: when,
      trigger: () => {
        if (this.onended) {
          this.onended();
        }
      },
    });
  }
}

class MockGainNode extends MockAudioNode {
  gain: MockAudioParam;

  constructor(ctx: MockAudioContext) {
    super(ctx);
    this.gain = new MockAudioParam('gain', 1.0);
    ctx.allGains.push(this);
  }
}

class MockAudioContext {
  currentTime: number = 0;
  state: 'suspended' | 'running' | 'closed' = 'running';
  destination: MockAudioNode;
  resumeRejectionReason: Error | null = null;
  resumeCallCount: number = 0;

  allNodes: MockAudioNode[] = [];
  allOscillators: MockOscillatorNode[] = [];
  allGains: MockGainNode[] = [];
  activeConnections: Set<TrackedConnection> = new Set();
  scheduledStops: Array<{ time: number; trigger: () => void }> = [];

  constructor() {
    this.destination = new MockAudioNode(this);
  }

  createOscillator(): MockOscillatorNode {
    return new MockOscillatorNode(this);
  }

  createGain(): MockGainNode {
    return new MockGainNode(this);
  }

  resume(): Promise<void> {
    this.resumeCallCount++;
    if (this.resumeRejectionReason) {
      return Promise.reject(this.resumeRejectionReason);
    }
    this.state = 'running';
    return Promise.resolve();
  }

  advanceTime(deltaSeconds: number) {
    this.currentTime += deltaSeconds;
    const remaining: Array<{ time: number; trigger: () => void }> = [];
    for (const item of this.scheduledStops) {
      if (item.time <= this.currentTime) {
        item.trigger();
      } else {
        remaining.push(item);
      }
    }
    this.scheduledStops = remaining;
  }

  advanceToEnd() {
    let maxTime = this.currentTime;
    for (const item of this.scheduledStops) {
      if (item.time > maxTime) maxTime = item.time;
    }
    this.advanceTime(maxTime - this.currentTime + 0.1);
  }
}

class MockLocalStorage {
  private store: Map<string, string> = new Map();
  throwOnSet = false;
  throwOnGet = false;

  getItem(key: string): string | null {
    if (this.throwOnGet) throw new Error('Quota or Security error in getItem');
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.throwOnSet) throw new Error('Quota or Security error in setItem');
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Global environment setup
const mockStorage = new MockLocalStorage();
let currentMockCtx: MockAudioContext | null = null;

function setupMockWindow(audioCtxState: 'running' | 'suspended' = 'running', rejectResume?: Error) {
  currentMockCtx = new MockAudioContext();
  currentMockCtx.state = audioCtxState;
  if (rejectResume) {
    currentMockCtx.resumeRejectionReason = rejectResume;
  }

  (global as any).window = {
    AudioContext: class {
      constructor() {
        return currentMockCtx!;
      }
    },
    localStorage: mockStorage,
  };
  (global as any).localStorage = mockStorage;
  return currentMockCtx;
}

// Test runner helper
let totalPassed = 0;
let totalFailed = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    totalFailed++;
    failureDetails.push(message);
    console.error(`  FAIL: ${message}`);
  } else {
    totalPassed++;
    console.log(`  PASS: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('ADVERSARIAL STRESS TEST SUITE: Neon Nonogram Web Audio Synthesis');
  console.log('================================================================\n');

  // Load sounds module dynamically with fresh mock window
  const ctx = setupMockWindow('running');
  const Sounds = await import('./sounds');

  // ============================================================================
  // SUITE 1: 200+ Rapid Burst Triggers & Audio Graph Node Disconnection/Leak Check
  // ============================================================================
  console.log('[SUITE 1] Rapid Burst Triggers & Audio Graph Node Cleanup');
  {
    Sounds.setMuted(false);
    const startConnCount = ctx.activeConnections.size;
    const startOscCount = ctx.allOscillators.length;
    const startGainCount = ctx.allGains.length;

    // Simulate rapid drag across 15x15 board: 225 rapid fill/cross events
    console.log('  Triggering 225 rapid fill & cross sounds...');
    for (let i = 0; i < 150; i++) {
      Sounds.playFillSound(1);
    }
    for (let i = 0; i < 75; i++) {
      Sounds.playCrossSound();
    }

    // Trigger remaining sounds
    for (let i = 0; i < 10; i++) Sounds.playMistakeSound();
    for (let i = 0; i < 5; i++) Sounds.playLineCompleteSound();
    for (let i = 0; i < 3; i++) Sounds.playHintSound();
    for (let i = 0; i < 15; i++) Sounds.playUndoSound();
    for (let i = 0; i < 2; i++) Sounds.playVictorySound();

    const createdOscs = ctx.allOscillators.length - startOscCount;
    const createdGains = ctx.allGains.length - startGainCount;
    console.log(`  Created ${createdOscs} oscillators and ${createdGains} gain nodes during burst.`);
    assert(createdOscs > 250, `Oscillators created (${createdOscs}) should reflect burst calls.`);
    assert(ctx.activeConnections.size > 0, 'Active connections should exist while sounds are playing.');

    // Check that every created oscillator has an onended callback
    let oscsWithoutOnended = 0;
    for (const osc of ctx.allOscillators) {
      if (!osc.onended) oscsWithoutOnended++;
    }
    assert(oscsWithoutOnended === 0, `All oscillators must have onended handler attached (found ${oscsWithoutOnended} without).`);

    // Advance mock time until all audio playback completes
    ctx.advanceToEnd();

    // Verify all connections were severed
    assert(
      ctx.activeConnections.size === 0,
      `All audio connections must be disconnected onended to prevent memory leaks (remaining active: ${ctx.activeConnections.size}).`
    );

    // Verify all outgoing connections are marked disconnected
    let unDisconnectedCount = 0;
    for (const node of ctx.allNodes) {
      for (const conn of node.outgoingConnections) {
        if (!conn.disconnected) unDisconnectedCount++;
      }
    }
    assert(unDisconnectedCount === 0, `Every outgoing connection should be marked disconnected (found ${unDisconnectedCount} orphaned).`);
  }

  // ============================================================================
  // SUITE 2: Autoplay Policies, Suspended States & Unhandled Rejections
  // ============================================================================
  console.log('\n[SUITE 2] Autoplay Policies, Suspended State & Unhandled Rejection Absorption');
  {
    let unhandledRejectionCaught = false;
    const onUnhandled = (reason: any) => {
      unhandledRejectionCaught = true;
      console.error('  UNHANDLED PROMISE REJECTION DETECTED:', reason);
    };
    process.on('unhandledRejection', onUnhandled);

    try {
      // Set audio context to suspended with an aggressive rejection reason
      ctx.state = 'suspended';
      ctx.resumeRejectionReason = new Error('DOMException: The play() request was interrupted or blocked by user gesture policy.');

      // Trigger multiple sounds while suspended
      Sounds.playFillSound(1);
      Sounds.playCrossSound();
      Sounds.playMistakeSound();
      Sounds.playVictorySound();

      // Allow microtask queue to process any unhandled promise rejections
      await new Promise((res) => setTimeout(res, 50));

      assert(!unhandledRejectionCaught, 'No unhandled promise rejections should occur when audioCtx.resume() is rejected.');
      assert(ctx.resumeCallCount > 0, `audioCtx.resume() should have been called (actual: ${ctx.resumeCallCount}).`);

      // Reset state for subsequent tests
      ctx.state = 'running';
      ctx.resumeRejectionReason = null;
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  }

  // ============================================================================
  // SUITE 3: Numerical Edge Cases (Combos, Extreme / Negative Values, NaNs)
  // ============================================================================
  console.log('\n[SUITE 3] Numerical Edge Cases & AudioParam Robustness');
  {
    // Test combo multiplier range
    console.log('  Testing combo multiplier edge cases...');

    // Normal positive combos
    Sounds.playFillSound(1);
    Sounds.playFillSound(2);
    Sounds.playFillSound(5);
    Sounds.playFillSound(10);
    Sounds.playFillSound(100); // Extreme high combo
    assert(true, 'Positive combos up to 100 execute cleanly without clamping error.');

    // Boundary combo values: combo = 0
    Sounds.playFillSound(0);
    assert(true, 'combo = 0 executes without exception.');

    // Negative combos: check whether exponential ramp throws on non-positive baseFreq
    let negativeComboThrew = false;
    let negativeComboErrorMsg = '';
    try {
      Sounds.playFillSound(-10);
    } catch (err: any) {
      negativeComboThrew = true;
      negativeComboErrorMsg = err.message;
    }

    if (negativeComboThrew) {
      console.warn(`  [VULNERABILITY DETECTED] playFillSound(-10) threw: ${negativeComboErrorMsg}`);
      assert(false, `playFillSound should guard against negative/zero frequency on negative combos: ${negativeComboErrorMsg}`);
    } else {
      assert(true, 'playFillSound(-10) executed safely.');
    }

    // NaN combo test
    let nanComboThrew = false;
    try {
      Sounds.playFillSound(NaN);
    } catch (err: any) {
      nanComboThrew = true;
    }
    if (nanComboThrew) {
      console.warn('  [VULNERABILITY DETECTED] playFillSound(NaN) threw exception.');
      assert(false, 'playFillSound should guard against NaN combo values.');
    } else {
      assert(true, 'playFillSound(NaN) handled gracefully.');
    }

    // Clean up scheduled audio
    ctx.advanceToEnd();
  }

  // ============================================================================
  // SUITE 4: Envelope Safety & Audio Transient / Click Prevention (F15)
  // ============================================================================
  console.log('\n[SUITE 4] Audio Transient / Click Prevention Envelopes');
  {
    const startGainIdx = ctx.allGains.length;

    // Trigger each sound function once to examine its gain envelope events
    Sounds.playFillSound(1);
    Sounds.playCrossSound();
    Sounds.playMistakeSound();
    Sounds.playLineCompleteSound(); // 2 notes
    Sounds.playHintSound();         // 4 notes
    Sounds.playUndoSound();
    Sounds.playVictorySound();      // 5 notes

    const newGains = ctx.allGains.slice(startGainIdx);
    console.log(`  Examining ${newGains.length} gain envelopes across all 7 sound types...`);

    let zeroAttackViolations = 0;
    let nonZeroFinalReleaseViolations = 0;

    for (const gainNode of newGains) {
      const events = gainNode.gain.events;
      if (events.length === 0) continue;

      // Event 0 must set gain to <= 0.0001 (micro-attack start)
      const firstEvent = events[0];
      if (firstEvent.type !== 'setValueAtTime' || firstEvent.value > 0.0002) {
        zeroAttackViolations++;
      }

      // Last event must ramp gain to 0 (click-free release)
      const lastEvent = events[events.length - 1];
      if (lastEvent.value !== 0) {
        nonZeroFinalReleaseViolations++;
      }
    }

    assert(
      zeroAttackViolations === 0,
      `All sound gains must start at near-zero (<= 0.0001) to prevent step clicks (found ${zeroAttackViolations} violations).`
    );
    assert(
      nonZeroFinalReleaseViolations === 0,
      `All sound gains must end with ramp to 0 to prevent release clicks (found ${nonZeroFinalReleaseViolations} violations).`
    );

    ctx.advanceToEnd();
  }

  // ============================================================================
  // SUITE 5: Mute State Synchronization Across Storage & Memory (F12)
  // ============================================================================
  console.log('\n[SUITE 5] Mute State Synchronization across Storage & Memory');
  {
    // Mute is enabled
    Sounds.setMuted(true);
    assert(Sounds.getMuted() === true, 'getMuted() should return true after setMuted(true).');
    assert(Sounds.isAudioMuted() === true, 'isAudioMuted() should return true after setMuted(true).');
    assert(mockStorage.getItem('nonogram-sound-muted') === 'true', 'localStorage should contain "true".');

    const oscCountBefore = ctx.allOscillators.length;
    Sounds.playFillSound(1);
    Sounds.playCrossSound();
    Sounds.playMistakeSound();
    Sounds.playVictorySound();
    const oscCountAfter = ctx.allOscillators.length;
    assert(oscCountAfter === oscCountBefore, 'Zero oscillators should be created when game is muted.');

    // Unmute
    Sounds.setMuted(false);
    assert(Sounds.getMuted() === false, 'getMuted() should return false after setMuted(false).');
    assert(Sounds.isAudioMuted() === false, 'isAudioMuted() should return false after setMuted(false).');
    assert(mockStorage.getItem('nonogram-sound-muted') === 'false', 'localStorage should contain "false".');

    Sounds.playFillSound(1);
    assert(ctx.allOscillators.length === oscCountAfter + 1, 'Oscillator should be created after unmuting.');

    // Storage throw safety: simulate private browsing localStorage quota / security error
    mockStorage.throwOnSet = true;
    let setMutedThrew = false;
    try {
      Sounds.setMuted(true);
    } catch {
      setMutedThrew = true;
    }
    assert(!setMutedThrew, 'setMuted should not throw if localStorage.setItem fails in private browsing.');
    mockStorage.throwOnSet = false;

    mockStorage.throwOnGet = true;
    let getMutedThrew = false;
    try {
      Sounds.getMuted();
    } catch {
      getMutedThrew = true;
    }
    assert(!getMutedThrew, 'getMuted should not throw if localStorage.getItem fails in private browsing.');
    mockStorage.throwOnGet = false;

    ctx.advanceToEnd();
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log(`STRESS TEST SUMMARY: ${totalPassed} passed, ${totalFailed} failed.`);
  if (totalFailed > 0) {
    console.log('FAILURES:');
    failureDetails.forEach((f, idx) => console.log(`  ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('ALL ADVERSARIAL STRESS TESTS COMPLETED SUCCESSFULLY.');
    console.log('================================================================');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal stress test suite runner error:', err);
  process.exit(1);
});
