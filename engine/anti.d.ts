// Type definitions for Anti - a themeable interaction sound engine.
// Synthesis-only, dependency-free Web Audio. Attaches to `window.Anti`.
// https://anti.fyi

/** Waveforms available to a theme's timbre slots. `noise` (v0.9) is looped
 *  white noise through a bandpass centered on the note, so pitch still
 *  carries the value: breath instead of tone. */
type AntiWave = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise';

/** Pitch scales the ladder is built from. Pentatonics never hit a wrong note. */
type AntiScale =
  | 'majorPentatonic' | 'minorPentatonic'
  | 'major' | 'minor' | 'dorian' | 'mixolydian' | 'lydian' | 'wholeTone';

/** Modal-resonator materials layered under the contact events. */
type AntiMaterial =
  | 'none' | 'glass' | 'wood' | 'rubber' | 'metal'
  | 'ceramic' | 'plastic' | 'felt' | 'membrane'
  | 'stone' | 'paper';

/** One-shot voice articulation. `chirp` glides each voice down an octave into its note. */
type AntiArticulation = 'none' | 'chirp';

/** The fixed grammar. `invalid` is a deprecated alias for `reject`.
 *  `undo` is the take-back: the tick played backwards (swell in, bend down, seat).
 *  `signature` is the brand moment: deterministic per theme and seed. */
type AntiEvent =
  | 'grab' | 'tick' | 'undo' | 'commit' | 'reject' | 'release'
  | 'success' | 'info' | 'warning' | 'error' | 'signature';

/** Per-event override, keyed by event name in `theme.events`. */
interface AntiEventOverride {
  /** Gain multiplier, 0..2. */
  gain?: number;
  /** Octave shift, -3..3 (rounded). */
  octave?: number;
  /** Material amount override for this event, 0..1. */
  material?: number;
}

/** The theme object: one JSON that retunes the whole grammar. */
interface AntiTheme {
  name: string;
  key: { root: string; scale: AntiScale; octaves: [number, number] };
  timbre: { neutral: AntiWave; secondary: AntiWave; charged: AntiWave; brightness: number; articulation: AntiArticulation };
  material: { type: AntiMaterial; amount: number };
  envelope: { firmness: number; release: number };
  gain: { voice: number; master: number };
  /** Repetition governor amount, 0..1: fast repeats of one event thin themselves. 0 disables. */
  etiquette: { repetition: number };
  /** The signature's variation seed. Same theme and seed, same motif: a logo is fixed. */
  signature: { seed: number };
  events: Record<string, AntiEventOverride>;
}

type AntiDeepPartial<T> = { [K in keyof T]?: T[K] extends object ? AntiDeepPartial<T[K]> : T[K] };

/** What you actually hand to setTheme: every field optional, merged over the
 *  default. `AntiTheme` is the complete object getTheme gives back, and
 *  annotating an edit with it asks for all of it, which is not the deal. */
type AntiPartialTheme = AntiDeepPartial<AntiTheme>;

interface AntiPlayOpts {
  /** 0..1, maps to a pitch on the ladder. */
  value?: number;
}

interface AntiRenderOpts {
  /** 0..1, maps to a pitch on the ladder. */
  value?: number;
  /** Seconds to render, 0.5..10 (default 2.5). */
  duration?: number;
  /** Render sample rate (default 48000). */
  sampleRate?: number;
}

/** Continuous change: a held voice that glides with the value. Stateful per id.
 *  Intensity (0..1, nominal 0.5) is the second axis: the gesture's energy
 *  (velocity, scale, pressure) riding the drone's level. Omit to hold nominal. */
interface AntiDrone {
  start(id: string, value?: number, intensity?: number): void;
  move(id: string, value: number, intensity?: number): void;
  stop(id: string): void;
}

/** Loading made audible: a run that resolves exactly at 100%. Stateful per id. */
interface AntiProgress {
  start(id: string, value?: number): void;
  /** Indeterminate: still working, no ETA. Rocks between two rungs, promises nothing. */
  hold(id: string): void;
  /** Converts a hold into a determinate run. */
  set(id: string, value: number): void;
  /** Resolve onto the tonic. */
  done(id: string): void;
  /** Abandon without resolving. */
  stop(id: string): void;
}

interface AntiApi {
  readonly version: string;
  /**
   * True when a call will sound: the engine is enabled and the AudioContext
   * is running, or a resume is in flight (iOS arms and resumes asynchronously,
   * and a voice queued in that window lands when the context starts). False
   * before the first user gesture and while disabled.
   */
  readonly ready: boolean;

  /** Fire a grammar event. No-op until armed or when disabled. */
  play(name: AntiEvent | 'invalid', opts?: AntiPlayOpts): void;

  /** Wire declarative bindings: data-anti, data-anti-hover, data-anti-down, data-anti-up. */
  bind(root?: Element | Document): void;

  drone: AntiDrone;
  progress: AntiProgress;

  /**
   * Stop everything currently sounding: every held drone, every progress run.
   * One-shots are left to finish. Call it when a view that could be holding a
   * gesture goes away (a room switch, a route change, a closing panel).
   */
  silence(): void;

  /** Merge a partial theme; pass { replace: true } to rebuild from the default. */
  setTheme(partial: AntiDeepPartial<AntiTheme>, opts?: { replace?: boolean }): void;
  getTheme(): AntiTheme;

  readonly materials: AntiMaterial[];
  readonly scales: AntiScale[];

  /**
   * The grammar in canonical order: every event this engine can play, without
   * the deprecated 'invalid' alias. Enumerate from here rather than keeping a
   * copy (the studio's exported pack does exactly this).
   */
  readonly events: AntiEvent[];

  /** Listener on/off. Persisted across sessions. Returns the new state. */
  setEnabled(on: boolean): boolean;
  readonly enabled: boolean;

  /** Listener volume 0..1, distinct from the theme master. Persisted. Returns the clamped value. */
  setVolume(v: number): number;
  readonly volume: number;

  /** Render one event offline into an AudioBuffer (for exporting native packs). */
  render(name: AntiEvent, opts?: AntiRenderOpts): Promise<AudioBuffer>;

  /** Create/resume the AudioContext. Normally handled automatically on first gesture. */
  resume(): void;
}

declare const Anti: AntiApi;

interface Window {
  Anti: AntiApi;
}
