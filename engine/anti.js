/*
  Anti v0.9.6 - a themeable interaction sound engine.
  Synthesis only, no assets. One theme object retunes the whole grammar.
  Grammar: grab / tick / undo / commit / reject / release, drones (continuous change),
  notifications (success / info / warning / error).
  v0.2 adds the material dimension: a modal resonator bank (glass / wood /
  rubber / metal) layered under the contact events, from the grain experiment.
  v0.3 adds Anti.render (any event rendered into an OfflineAudioContext,
  resolving to an AudioBuffer, so the studio can export WAV packs) and the
  progress tier (Anti.progress.start/set/done/stop): loading made audible,
  a voice-led run that resolves exactly at 100%, from the meter experiment.
  v0.3.1 renames the 'invalid' event to 'reject' ('invalid' kept as an alias).
  v0.4 widens the palette (eight scales incl. modes and whole-tone, eight
  materials), adds listener etiquette (Anti.setEnabled / setVolume, persisted)
  so leaving it on is a real choice, and a brickwall limiter so nothing spikes.
  v0.5 completes the grammar for real interfaces: tick (the positional micro
  event: focus moves, detents, insertion points), Anti.progress.hold (the
  indeterminate holding pattern, still working with no ETA), a repetition
  governor (fast repeats of the same event thin themselves: annoyance safety
  enforced the way the limiter enforces loudness), an intensity axis on drones
  (velocity or pressure audible beyond pitch), and scale-aware commit (minor
  themes now commit minor: the triad is built from the ladder, not assumed).
  v0.6 widens the material palette to ten (stone: dense, damped, a tight
  mineral clack; paper: a crinkle, the first material whose voice is a scatter
  of micro-impulses rather than one burst, via the crinkle recipe field) and
  adds the articulation dimension (timbre.articulation: 'chirp' glides every
  one-shot voice down an octave into its target note, the laser done politely:
  endpoints quantized to the ladder, the fall over in tens of milliseconds).
  v0.7 adds the signature tier: the brand moment, a roughly two-second motif
  generated deterministically from the theme and its signature.seed. The one
  deliberate exception to "never the same waveform": a sonic logo is fixed.
  v0.7.1 makes two engine promises true. The signature is now genuinely
  bit-deterministic: its material layer (contact detune, crinkle, noise burst)
  drew from Math.random and now draws from a seeded stream, so a rendered logo
  is byte-identical every time. And the loudness ceiling is real: theme JSON is
  sanitized on ingest (master gain and the graph-facing numbers clamped, NaN
  rejected) and a hard-clip stage closes the bus, so nothing leaves it above
  0 dBFS. deepMerge also drops __proto__/constructor/prototype so an untrusted
  theme can no longer pollute Object.prototype.
  v0.8 adds undo: the take-back, typing's micro gesture played backwards
  (from the keys experiment). The one mirrored envelope in the grammar: the
  voice swells in slowly, bends down an octave (both endpoints on the
  ladder), and seats fast, so a deletion reads as the insertion reversed.
  v0.9 makes noise a first-class timbre: any timbre slot may be 'noise',
  voiced as looped white noise through a bandpass centered on the ladder
  rung, so pitch still carries the value and the whole grammar survives
  (ticks hiss at their rung, drones become breath that glides, commit is a
  chord of colored air). Envelope, chirp, and firmness act on gain and
  filter, unchanged. The tape theme is the payoff: hiss as identity.
  v0.9.1 adds Anti.silence: stop every held drone and progress run at once,
  the contract behind a view that can be left mid-gesture (a route change, a
  closing panel), so a caller need not track what it started.
  v0.9.2 adds Anti.events: the grammar in canonical order, so nothing
  downstream (an editor, a rendered pack, a spec sheet) keeps its own copy.
  v0.9.3 fixes the silent first gesture on iOS. An AudioContext there always
  starts suspended and resume() settles asynchronously, so the state was still
  'suspended' for the remainder of the gesture that armed the engine, and the
  readiness gate (state === 'running') turned that first tap into the one tap
  that made no sound. Every iOS browser is WebKit, so this was all of them.
  The gate now also passes while a resume is in flight; a suspended context
  does not advance currentTime, so a voice queued in that window lands the
  moment the context starts. Desktop never showed it because the context there
  is usually already running by the time anyone taps.
  v0.9.4 hardens the ingest and lookup edges (2026-08 audit). sanitizeTheme
  now covers the whole graph-facing surface: key.root and key.scale must
  name real entries, key.octaves must be an ordered pair, firmness, the
  timbre wave names, material type and amount are all normalized, so a
  malformed theme degrades to defaults instead of throwing a TypeError on
  every later event. Event lookup and the repetition ledger no longer read
  inherited keys, so play('__proto__') is a no-op instead of a prototype
  pollution plus a crash. NaN is rejected at the remaining public edges
  (drone intensity, progress values, per-event overrides). deepMerge copies
  arrays, so getTheme is a true snapshot and a caller mutating an array it
  passed in no longer edits the live theme behind the sanitizer's back.
  render() and resume() no longer touch bare window, so a server render
  gets a rejected promise or a no-op instead of a ReferenceError; render
  also rejects, rather than throws, when scheduling fails.
  v0.9.5 closes the two edges the 2026-08-30 audit found still open in that
  claim: the drone and progress maps are null-prototype like the repetition
  ledger, so an app-supplied id of '__proto__' is an ordinary key instead of
  a prototype write plus a voice nothing releases, and setVolume refuses a
  non-finite value instead of persisting NaN and throwing on a live bus.
  v0.9.6 fixes the bus falling behind the theme. setTheme wrote the theme's
  brightness and master gain to the bus only while the engine was sounding,
  so a theme changed with the listener's switch off (or with the context
  suspended) reached every voice and not the bus: after unmuting, the new
  theme played through the old brightness and the old level until the next
  edit, and an audition disagreed with a pack rendered from the same theme.
  The bus now follows the theme whenever there is a bus.
*/
// One file, three ways in. As a <script> tag it hangs the API on window.Anti,
// which is how every surface in this repo loads it, from file://, with no
// build. As a CommonJS require it returns that same object. And the ESM entry
// the npm package ships is this file with the two marked wrapper halves
// swapped for an export footer (tools/build-package.js). The engine between
// the markers knows about none of that, which is why the swap can stay a
// string replace instead of becoming a bundler.
/* @anti:head */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.Anti = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
/* @anti:body */
  'use strict';

  var VERSION = '0.9.6';
  var VOICE_CAP = 16;
  var MIN_GAIN = 0.0001;

  var SEMITONES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  // Scale degrees in semitones. Pentatonics have no wrong note (safest defaults);
  // the seven-note modes and whole-tone widen the emotional range a theme can
  // reach. Every scale still lands resolved via resolvedNear (root or fifth).
  var SCALES = {
    majorPentatonic: [0, 2, 4, 7, 9],
    minorPentatonic: [0, 3, 5, 7, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    wholeTone: [0, 2, 4, 6, 8, 10]
  };

  // Modal recipes from the grain experiment, ear-tuned there: each material is a
  // noise transient (tr) plus a bank of damped partials (modes: ratio, gain, decay).
  var MATERIALS = {
    glass: {
      base: 1245,
      modes: [{ r: 1, g: 0.11, d: 0.9 }, { r: 2.68, g: 0.075, d: 0.7 }, { r: 5.02, g: 0.05, d: 0.5 }, { r: 8.6, g: 0.03, d: 0.35 }],
      tr: { type: 'highpass', freq: 5200, q: 0.7, g: 0.09, d: 0.028 }
    },
    wood: {
      base: 372,
      modes: [{ r: 1, g: 0.14, d: 0.15 }, { r: 2.42, g: 0.08, d: 0.1 }, { r: 4.05, g: 0.045, d: 0.07 }],
      tr: { type: 'bandpass', freq: 1500, q: 1.1, g: 0.12, d: 0.02 }
    },
    rubber: {
      base: 176,
      modes: [{ r: 1, g: 0.14, d: 0.07 }, { r: 1.9, g: 0.06, d: 0.045 }],
      tr: { type: 'lowpass', freq: 540, q: 0.7, g: 0.14, d: 0.03 }
    },
    metal: {
      base: 812,
      modes: [{ r: 1, g: 0.095, d: 1.7 }, { r: 2.76, g: 0.075, d: 1.4 }, { r: 5.4, g: 0.055, d: 1.1 }, { r: 8.93, g: 0.035, d: 0.85 }, { r: 13.34, g: 0.02, d: 0.6 }],
      tr: { type: 'highpass', freq: 4400, q: 0.7, g: 0.075, d: 0.02 }
    },
    // v0.4 materials: modal banks built from acoustics (ceramic/porcelain is
    // glass-family but tighter; plastic is a dull hollow tok; felt is a soft
    // muffled tap; membrane is a struck drum head, circular modes). Starting
    // values, still want an ear pass on the bench.
    ceramic: {
      base: 1720,
      modes: [{ r: 1, g: 0.1, d: 0.55 }, { r: 2.81, g: 0.07, d: 0.4 }, { r: 5.44, g: 0.045, d: 0.28 }, { r: 8.9, g: 0.025, d: 0.18 }],
      tr: { type: 'highpass', freq: 6000, q: 0.7, g: 0.085, d: 0.022 }
    },
    plastic: {
      base: 430,
      modes: [{ r: 1, g: 0.13, d: 0.12 }, { r: 2.9, g: 0.05, d: 0.07 }],
      tr: { type: 'lowpass', freq: 1100, q: 0.8, g: 0.1, d: 0.018 }
    },
    felt: {
      base: 150,
      modes: [{ r: 1, g: 0.14, d: 0.09 }, { r: 2.1, g: 0.05, d: 0.05 }],
      tr: { type: 'lowpass', freq: 360, q: 0.7, g: 0.11, d: 0.035 }
    },
    membrane: {
      base: 180,
      modes: [{ r: 1, g: 0.14, d: 0.4 }, { r: 1.59, g: 0.06, d: 0.25 }, { r: 2.14, g: 0.04, d: 0.18 }, { r: 2.3, g: 0.03, d: 0.14 }, { r: 2.65, g: 0.02, d: 0.1 }],
      tr: { type: 'bandpass', freq: 400, q: 1, g: 0.1, d: 0.02 }
    },
    // v0.6 materials. Stone: rock on rock is three sounds at once: a flinty
    // high click where the surfaces meet, a dull low knock from the mass, and
    // a granular chatter because two stones never touch at just one point
    // (gravel is that scatter multiplied). So: a hard highpassed transient,
    // a low knock body with dissonant mid partials that die fast, and a tight
    // crinkle of semi-pitched grains. Paper: almost no modal body at all; the
    // voice is the crinkle, a scatter of tiny filtered impulses (the crinkle
    // field), plus one weak flap mode. Both want the ear pass on the bench.
    stone: {
      base: 285,
      modes: [{ r: 1, g: 0.13, d: 0.09 }, { r: 1.48, g: 0.05, d: 0.07 }, { r: 2.32, g: 0.06, d: 0.06 }, { r: 3.75, g: 0.045, d: 0.05 }, { r: 6.2, g: 0.03, d: 0.035 }],
      tr: { type: 'highpass', freq: 5600, q: 0.7, g: 0.13, d: 0.012 },
      crinkle: { n: 3, spread: 0.022, freq: 3300, q: 1.8, g: 0.055 }
    },
    paper: {
      base: 420,
      modes: [{ r: 1, g: 0.05, d: 0.05 }],
      tr: { type: 'bandpass', freq: 3400, q: 0.8, g: 0.07, d: 0.02 },
      crinkle: { n: 5, spread: 0.045, freq: 4600, q: 1.2, g: 0.05 }
    }
  };

  var DEFAULT_THEME = {
    name: 'Anti default',
    key: { root: 'C', scale: 'majorPentatonic', octaves: [3, 6] },
    timbre: { neutral: 'sine', secondary: 'triangle', charged: 'sawtooth', brightness: 2400, articulation: 'none' },
    material: { type: 'none', amount: 0.7 },
    envelope: { firmness: 0.5, release: 0.4 },
    gain: { voice: 0.1, master: 0.9 },
    etiquette: { repetition: 0.5 },
    signature: { seed: 0 },
    events: {}
  };

  var theme = deepMerge({}, DEFAULT_THEME);
  var actx = null;
  var rng = Math.random; // material randomness draws from here; the signature swaps in a seeded generator so a logo renders bit-identically, everything else keeps live variety
  var bus = null; // { master, filter, comp, limiter, userGain, clip }
  var clickBuf = null; // shared noise burst for material contact transients
  var noiseBuf = null; // shared looped noise bed for the 'noise' timbre
  // How pitched the noise timbre is: the bandpass Q on the noise voice. High
  // enough that the ladder rung is clearly audible (the value must survive),
  // low enough that the band rings up within a tick's 50 ms. Ear-tunable.
  var NOISE_Q = 8;
  // A bandpass passes only sqrt(bandwidth / nyquist) of white noise's energy,
  // so an uncompensated noise voice sits ~20 dB under an oscillator at the
  // same gain and the loudness hierarchy between events collapses. Equalize
  // per voice at its center frequency: gain ~ sqrt(Q * nyquist / f), slightly
  // under parity. Noise crests ~2x higher than a sine at equal RMS; the bus
  // limiter and the hard clip still hold the ceiling promise.
  function noiseComp(freq) {
    return Math.min(24, 0.8 * Math.sqrt(NOISE_Q * 24000 / Math.max(60, freq)));
  }
  var offline = false; // true while an event schedules into an OfflineAudioContext
  var vc = { n: 0 }; // voice counter, an object so cleanup closures survive render swaps
  // Null prototypes for the same reason as the repetition ledger below: these
  // are keyed on caller-supplied ids, and a plain object answers '__proto__'
  // with Object.prototype, which reads as a live drone or run and turns the
  // start/move fork into a write through the prototype plus a crash.
  var drones = Object.create(null); // id -> { osc, gain }
  var progressV = Object.create(null); // id -> { lead, pad, ref, p, ctx }: the progress tier's held voices
  var ladderCache = null;
  var enabled = true; // listener on/off, persisted; when false the whole engine goes silent
  var userVol = 1;    // listener volume 0..1, persisted; distinct from the theme's master gain
  // True from calling resume() until the promise settles. iOS is why this
  // exists: an AudioContext there always starts suspended, and resume()
  // resolves asynchronously, so the state is still 'suspended' for the rest of
  // the gesture that armed it. Gating on 'running' alone therefore made the
  // arming tap the one tap that never sounds, on every iOS browser (they are
  // all WebKit). Scheduling during this window is safe and is in fact the
  // point: a suspended context does not advance currentTime, so a voice queued
  // here lands the instant the context starts, which is when the tap that
  // queued it should be heard.
  var arming = false;

  function deepMerge(target, src) {
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      // Reject prototype-polluting keys. Once the engine is public a theme is
      // untrusted JSON, and JSON.parse materializes __proto__ as a real own key
      // that would otherwise write straight onto Object.prototype.
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      var v = src[k];
      if (Array.isArray(v)) {
        // Copy, never alias: getTheme must be a snapshot, and a caller
        // mutating an array it passed to setTheme must not edit the live
        // theme behind the sanitizer's and ladder cache's backs.
        target[k] = v.slice();
      } else if (v && typeof v === 'object') {
        if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
        deepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    }
    return target;
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function safeNum(v, dflt, lo, hi) { return typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : dflt; }

  // Keep the numeric fields that reach the audio graph inside a sane range.
  // master is the one that can breach the loudness ceiling, so it is capped
  // hard; the rest guard against NaN and absurd values arriving in a theme
  // JSON. Enforced on every ingest, the way the limiter enforces loudness.
  var WAVES = { sine: 1, triangle: 1, sawtooth: 1, square: 1, noise: 1 };
  function safeWave(v, dflt) { return Object.prototype.hasOwnProperty.call(WAVES, v) ? v : dflt; }
  function ownKey(obj, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(obj, k); }
  function sanitizeTheme() {
    var g = theme.gain || (theme.gain = {});
    g.master = safeNum(g.master, 0.9, 0, 2);
    g.voice = safeNum(g.voice, 0.1, 0, 0.4);
    var tb = theme.timbre || (theme.timbre = {});
    tb.brightness = safeNum(tb.brightness, 2400, 60, 20000);
    tb.neutral = safeWave(tb.neutral, 'sine');
    tb.secondary = safeWave(tb.secondary, 'triangle');
    tb.charged = safeWave(tb.charged, 'sawtooth');
    if (tb.articulation !== 'chirp') tb.articulation = 'none';
    var en = theme.envelope || (theme.envelope = {});
    en.release = safeNum(en.release, 0.4, 0.05, 4);
    en.firmness = safeNum(en.firmness, 0.5, 0, 1);
    // The key is the one place a malformed value used to throw on every
    // later event rather than at ingest: ladder() indexes octaves and trusts
    // root/scale, so all three are normalized here, hasOwnProperty because
    // '__proto__' as a root would otherwise look up Object.prototype.
    var k = theme.key || (theme.key = {});
    if (!ownKey(SEMITONES, k.root)) k.root = 'C';
    if (!ownKey(SCALES, k.scale)) k.scale = 'majorPentatonic';
    var oc = Array.isArray(k.octaves) ? k.octaves : [];
    var lo = Math.round(safeNum(oc[0], NaN, 0, 8));
    var hi = Math.round(safeNum(oc[1], NaN, 1, 9));
    if (!isFinite(lo) || !isFinite(hi) || hi <= lo) { lo = 3; hi = 6; }
    k.octaves = [lo, hi];
    var m = theme.material || (theme.material = {});
    if (m.type !== 'none' && !ownKey(MATERIALS, m.type)) m.type = 'none';
    m.amount = safeNum(m.amount, 0.7, 0, 1);
    var et = theme.etiquette || (theme.etiquette = {});
    et.repetition = safeNum(et.repetition, 0.5, 0, 1);
    var sg = theme.signature || (theme.signature = {});
    if (typeof sg.seed !== 'number' || !isFinite(sg.seed)) sg.seed = 0;
    if (!theme.events || typeof theme.events !== 'object') theme.events = {};
  }

  // Load the listener's persisted preferences (silent no-op where storage is
  // blocked, e.g. private mode or SSR).
  (function loadPrefs() {
    try {
      var e = window.localStorage.getItem('anti.enabled');
      if (e != null) enabled = e !== 'false';
      var v = parseFloat(window.localStorage.getItem('anti.volume'));
      if (!isNaN(v)) userVol = clamp(v, 0, 1);
    } catch (e) {}
  })();

  function noteFreq(rootName, octave, semitoneOffset) {
    var midi = (octave + 1) * 12 + (SEMITONES[rootName] || 0) + semitoneOffset;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // The pitch ladder: every scale degree from the low octave up, topped with the high tonic,
  // so continuous values always have a resolved ceiling to land on.
  function ladder() {
    if (ladderCache) return ladderCache;
    var k = theme.key;
    var intervals = SCALES[k.scale] || SCALES.majorPentatonic;
    var freqs = [];
    for (var o = k.octaves[0]; o < k.octaves[1]; o++) {
      for (var i = 0; i < intervals.length; i++) freqs.push(noteFreq(k.root, o, intervals[i]));
    }
    freqs.push(noteFreq(k.root, k.octaves[1], 0));
    ladderCache = freqs;
    return freqs;
  }

  function pitchAt(value) {
    var l = ladder();
    var v = typeof value === 'number' && !isNaN(value) ? value : 0.5;
    var idx = Math.round(clamp(v, 0, 1) * (l.length - 1));
    return l[idx];
  }

  function ladderIdx(value) {
    var l = ladder();
    var v = typeof value === 'number' && !isNaN(value) ? value : 0.5;
    return Math.round(clamp(v, 0, 1) * (l.length - 1));
  }

  // Semitones above the ladder's low tonic at rung idx; valid past the top,
  // so chords built near the ceiling still have room.
  function semitoneAt(idx) {
    var intervals = SCALES[theme.key.scale] || SCALES.majorPentatonic;
    var per = intervals.length;
    return intervals[((idx % per) + per) % per] + 12 * Math.floor(idx / per);
  }
  function freqAtIdx(idx) {
    return noteFreq(theme.key.root, theme.key.octaves[0], semitoneAt(idx));
  }

  // The commit triad, built from the scale itself rather than assumed major:
  // the first third (minor or major, whichever the scale offers), the fifth
  // (whole-tone has none, its augmented fifth stands in), and the octave.
  // Minor themes commit minor; the resolution stays in character.
  function triadAt(idx) {
    var base = semitoneAt(idx);
    var third = null, fifth = null, alt = null;
    for (var j = idx + 1; j <= idx + 12; j++) {
      var d = semitoneAt(j) - base;
      if (d > 12) break;
      if (third == null && (d === 3 || d === 4)) third = j;
      if (fifth == null && d === 7) fifth = j;
      if (alt == null && (d === 8 || d === 6)) alt = j;
    }
    var f0 = freqAtIdx(idx);
    return [
      f0,
      third != null ? freqAtIdx(third) : f0 * 1.25,
      fifth != null ? freqAtIdx(fifth) : (alt != null ? freqAtIdx(alt) : f0 * 1.5),
      f0 * 2
    ];
  }

  // Firmness maps one 0..1 knob onto the whole mechanism, the switch experiment's
  // model: attack and decay character, the material transient's brightness and
  // length, the modal body's high-partial tilt, and drone onset stiffness.
  function firm() { return clamp(theme.envelope.firmness, 0, 1); }
  function attackTime() { return lerp(0.014, 0.006, firm()); }
  function decayScale() { return lerp(1.35, 0.65, firm()); }
  function trFreqScale() { return lerp(0.8, 1.3, firm()); }
  function trDurScale() { return lerp(1.5, 0.8, firm()); }
  function modeTilt() { return lerp(0.75, 1.05, firm()); }
  function droneOnset() { return lerp(0.09, 0.03, firm()); }

  // The repetition governor: annoyance safety, enforced like the limiter
  // enforces loudness. Fast repeats of the same event heat up and thin out
  // (each repeat a little quieter), cooling back to full voice over a second
  // of quiet. A sound can be beautiful once and unbearable at 10 Hz; the
  // engine knows the difference. theme.etiquette.repetition scales the effect
  // (0 disables). Offline render is exempt: exported packs are always full.
  var rep = Object.create(null); // event name -> { t: last fire time, heat: 0..1 }; null prototype so a hostile event name cannot read or write Object.prototype through it
  var REP_WINDOW = 0.35, REP_RECOVER = 1.5, REP_STEP = 0.25;
  function repGain(name) {
    if (offline || !actx) return 1;
    var amt = clamp(theme.etiquette && typeof theme.etiquette.repetition === 'number' ? theme.etiquette.repetition : 0.5, 0, 1);
    if (!amt) return 1;
    var now = actx.currentTime;
    var r = rep[name] || (rep[name] = { t: -REP_RECOVER, heat: 0 });
    var dt = now - r.t;
    r.heat = Math.max(0, r.heat - dt / REP_RECOVER);
    if (dt < REP_WINDOW) r.heat = Math.min(1, r.heat + REP_STEP);
    r.t = now;
    return 1 - amt * 0.75 * r.heat;
  }

  // Per-event overrides from theme.events[name]: gain multiplier, octave shift,
  // and a material amount override. Active only for the duration of one event.
  var evCtx = null;
  function ctxFor(name) {
    // Own-key lookup (an event named '__proto__' must not read Object.prototype)
    // and finite-number guards (NaN is typeof 'number' and would ride clamp
    // straight into an AudioParam).
    var o = theme.events && ownKey(theme.events, name) ? theme.events[name] : null;
    if (!o || typeof o !== 'object') o = {};
    return {
      gain: typeof o.gain === 'number' && isFinite(o.gain) ? clamp(o.gain, 0, 2) : 1,
      oct: Math.pow(2, Math.round(typeof o.octave === 'number' && isFinite(o.octave) ? clamp(o.octave, -3, 3) : 0)),
      material: typeof o.material === 'number' && isFinite(o.material) ? clamp(o.material, 0, 1) : null
    };
  }

  // A true brickwall: an identity curve inside [-1, 1] that hard-clamps anything
  // beyond, so a sample can never leave the bus above 0 dBFS however the graph is
  // driven. Transparent in normal use (the signal never reaches the rails there);
  // it only ever acts as the final safety net the "nothing spikes" promise needs.
  function makeClip(ctx) {
    var ws = ctx.createWaveShaper();
    ws.curve = new Float32Array([-1, 1]); // linear identity in range; inputs past +/-1 clamp to the endpoints
    ws.oversample = 'none';
    return ws;
  }

  // Bus: voice -> master (theme level) -> gentle lowpass (brightness) -> glue
  // compressor -> limiter -> user gain (the listener's own volume/mute) -> hard
  // clip (the real 0 dBFS ceiling) -> destination. Offline render bypasses the
  // user gain so exported packs are unaffected by a local setting.
  function makeBus(ctx, live) {
    var master = ctx.createGain();
    master.gain.value = theme.gain.master;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = theme.timbre.brightness;
    filter.Q.value = 0.5;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    var limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;
    var userGain = ctx.createGain();
    userGain.gain.value = live === false ? 1 : userVol;
    var clip = makeClip(ctx);
    master.connect(filter);
    filter.connect(comp);
    comp.connect(limiter);
    limiter.connect(userGain);
    userGain.connect(clip);
    clip.connect(ctx.destination);
    return { master: master, filter: filter, comp: comp, limiter: limiter, userGain: userGain, clip: clip };
  }

  function makeClickBuf(ctx) {
    var len = Math.floor(ctx.sampleRate * 0.06);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (rng() * 2 - 1) * Math.pow(1 - i / len, 1.5);
    return buf;
  }

  // One second of white noise, looped by every noise voice. Drawn from rng so
  // the signature can rebuild it from its seeded stream (a rendered logo on a
  // noise theme stays bit-identical).
  function makeNoiseBuf(ctx) {
    var len = Math.floor(ctx.sampleRate * 1.0);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = rng() * 2 - 1;
    return buf;
  }

  function ensureBus() {
    if (!actx || bus) return;
    bus = makeBus(actx, true);
    clickBuf = makeClickBuf(actx);
    noiseBuf = makeNoiseBuf(actx);
  }

  function unlock() {
    if (!actx) {
      // typeof guards, not window.: resume() is public API and must no-op,
      // not throw, where there is no window (a server render, a test runner).
      var AC = (typeof AudioContext !== 'undefined' && AudioContext) ||
        (typeof webkitAudioContext !== 'undefined' && webkitAudioContext) || null;
      if (!AC) return;
      actx = new AC();
    }
    // Bus first, so the arming window below has somewhere to schedule into.
    ensureBus();
    if (actx.state === 'running') return;
    arming = true;
    var settled = function () { arming = false; };
    try {
      var p = actx.resume();
      if (p && p.then) p.then(settled, settled); else settled();
    } catch (e) { settled(); }
  }

  // Lazy start on the first user gesture (autoplay policy). Before that, everything no-ops.
  // Guarded because importing the package must not throw where there is no
  // window to listen on (a server render, a test runner): the engine loads
  // silent and inert there, which is what it does before a gesture anyway.
  if (typeof window !== 'undefined' && window.addEventListener) {
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, unlock, { capture: true, passive: true });
    });
  }

  function running() {
    return offline || (enabled && !!(actx && bus && (actx.state === 'running' || arming)));
  }

  // The pitch source for one voice: an oscillator, or for the 'noise' timbre
  // looped white noise through a bandpass centered on the note, so pitch still
  // carries the value. Returns the node to start/stop and the AudioParam that
  // glides (the oscillator's frequency or the bandpass center): everything
  // downstream speaks to those two and never cares which timbre it got.
  function makeSource(wave, dest, freq) {
    if (wave === 'noise') {
      var src = actx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      var bp = actx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = NOISE_Q;
      var comp = actx.createGain();
      // Fixed at the voice's starting note; glides stay within an octave, so
      // the error across a glide is under ~1.5 dB.
      comp.gain.value = noiseComp(freq || 440);
      src.connect(bp);
      bp.connect(comp);
      comp.connect(dest);
      return { node: src, freq: bp.frequency, noise: true };
    }
    var osc = actx.createOscillator();
    osc.type = wave;
    osc.connect(dest);
    return { node: osc, freq: osc.frequency, noise: false };
  }

  // One enveloped voice. Exponential ramps only, self-cleans on ended.
  // The active event context bends pitch (octave) and gain.
  function voice(freq, wave, peak, attack, decay, when) {
    if (!running() || vc.n >= VOICE_CAP) return null;
    if (evCtx) { freq *= evCtx.oct; peak = clamp(peak * evCtx.gain, 0, 0.2); }
    var t = Math.max(actx.currentTime, when || actx.currentTime);
    var g = actx.createGain();
    var s = makeSource(wave, g, freq);
    if (theme.timbre.articulation === 'chirp') {
      // The articulation dimension: every one-shot voice glides down an octave
      // into its target note. Both endpoints sit on the ladder and the fall is
      // over in tens of ms (faster when firm): the laser, done politely.
      s.freq.setValueAtTime(freq * 2, t);
      s.freq.exponentialRampToValueAtTime(freq, t + attackTime() * 4);
    } else {
      s.freq.setValueAtTime(freq, t);
    }
    g.gain.setValueAtTime(MIN_GAIN, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, MIN_GAIN * 2), t + attack);
    g.gain.exponentialRampToValueAtTime(MIN_GAIN, t + attack + decay);
    g.connect(bus.master);
    trackNode(s.node, g);
    s.node.start(t);
    s.node.stop(t + attack + decay + 0.05);
    return s.node;
  }

  function vGain(scale) { return clamp(theme.gain.voice * (scale || 1), 0, 0.2); }

  function trackNode(node, g) {
    var c = vc;
    c.n++;
    node.onended = function () { c.n--; try { g.disconnect(); } catch (e) {} };
  }

  // Material gains were ear-tuned in grain at voice gain 0.1; track the theme's
  // voice gain from there, scaled by the layer amount and the event's velocity.
  function mGain(g, vel, amount) {
    var mul = evCtx ? evCtx.gain : 1;
    return clamp(g * (theme.gain.voice / 0.1) * amount * vel * mul, MIN_GAIN * 2, 0.2);
  }

  // The material contact: a filtered noise transient plus the bank of damped
  // partials, layered under grab / commit / release. Small per-mode detune keeps
  // every hit slightly different. Releases ring shorter and softer. Firmness
  // reaches in: crisp brightens and shortens the transient and keeps the upper
  // partials; soft darkens, lengthens, and rolls the partials off.
  function contact(vel, when, isRelease) {
    var mat = MATERIALS[theme.material.type];
    if (!mat || !running() || !clickBuf) return;
    var amount = evCtx && evCtx.material != null ? evCtx.material : clamp(theme.material.amount, 0, 1);
    if (amount <= 0) return;
    if (vc.n >= VOICE_CAP - 2) return;
    var t = Math.max(actx.currentTime, when || actx.currentTime);
    var trDur = mat.tr.d * trDurScale();
    var src = actx.createBufferSource();
    src.buffer = clickBuf;
    var bq = actx.createBiquadFilter();
    bq.type = mat.tr.type;
    bq.frequency.value = mat.tr.freq * trFreqScale();
    bq.Q.value = mat.tr.q;
    var tg = actx.createGain();
    src.connect(bq);
    bq.connect(tg);
    tg.connect(bus.master);
    tg.gain.setValueAtTime(MIN_GAIN, t);
    tg.gain.exponentialRampToValueAtTime(mGain(mat.tr.g, vel, amount), t + 0.001);
    tg.gain.exponentialRampToValueAtTime(MIN_GAIN, t + trDur);
    src.start(t);
    src.stop(t + trDur + 0.03);
    trackNode(src, tg);
    // The crinkle: a scatter of micro-impulses across a few tens of ms, each
    // randomly placed, filtered, and weighted, so no two touches of paper are
    // alike. Releases scatter fewer. Firmness reaches in through the same
    // transient scales as the main burst.
    if (mat.crinkle) {
      var cr = mat.crinkle;
      var nCr = isRelease ? Math.min(2, cr.n) : cr.n;
      for (var c = 0; c < nCr; c++) {
        if (vc.n >= VOICE_CAP) break;
        var ct = t + rng() * cr.spread * trDurScale();
        var cs = actx.createBufferSource();
        cs.buffer = clickBuf;
        var cb = actx.createBiquadFilter();
        cb.type = 'bandpass';
        cb.frequency.value = cr.freq * (0.8 + rng() * 0.5) * trFreqScale();
        cb.Q.value = cr.q;
        var cg = actx.createGain();
        cs.connect(cb); cb.connect(cg); cg.connect(bus.master);
        var cd = 0.008 + rng() * 0.012;
        cg.gain.setValueAtTime(MIN_GAIN, ct);
        cg.gain.exponentialRampToValueAtTime(mGain(cr.g, vel, amount) * (0.6 + rng() * 0.4), ct + 0.001);
        cg.gain.exponentialRampToValueAtTime(MIN_GAIN, ct + cd);
        cs.start(ct);
        cs.stop(ct + cd + 0.02);
        trackNode(cs, cg);
      }
    }
    var nModes = isRelease ? Math.min(2, mat.modes.length) : mat.modes.length;
    var decMul = isRelease ? 0.55 : 1;
    var tilt = modeTilt();
    for (var i = 0; i < nModes; i++) {
      if (vc.n >= VOICE_CAP) break;
      var mo = mat.modes[i];
      var detune = 1 + (rng() * 2 - 1) * 0.004;
      var osc = actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = mat.base * mo.r * detune;
      var g = actx.createGain();
      osc.connect(g);
      g.connect(bus.master);
      var dec = mo.d * decMul * decayScale();
      g.gain.setValueAtTime(MIN_GAIN, t);
      g.gain.exponentialRampToValueAtTime(mGain(mo.g * Math.pow(tilt, i), vel, amount), t + 0.002);
      g.gain.exponentialRampToValueAtTime(MIN_GAIN, t + 0.002 + dec);
      osc.start(t);
      osc.stop(t + 0.002 + dec + 0.04);
      trackNode(osc, g);
    }
  }

  // --- Core grammar ---------------------------------------------------------

  // grab: a short soft pluck at the value's pitch, striking the material.
  function grab(value) {
    contact(0.8);
    voice(pitchAt(value == null ? 0.4 : value), theme.timbre.neutral, vGain(1), attackTime(), 0.16 * decayScale());
  }

  // commit: a resolving triad (root, third, fifth, octave), slightly staggered,
  // built from the theme's own scale so minor themes commit minor. One gesture,
  // purely tonal: no contact strike layered under it, so it never reads as a
  // grab plus a chord. Material speaks through grab/release.
  function commit(value) {
    var freqs = triadAt(ladderIdx(value == null ? 0.5 : value));
    for (var i = 0; i < freqs.length; i++) {
      voice(freqs[i], i % 2 ? theme.timbre.secondary : theme.timbre.neutral,
        vGain(i === 0 ? 1 : 0.7), attackTime(), 0.35 * decayScale(), actx ? actx.currentTime + i * 0.03 : 0);
    }
  }

  // tick: the positional micro event. Focus moves, detents, list traversal,
  // an insertion point crossed: the most-fired sound in a real interface, so
  // it is quieter and shorter than grab, felt more than heard. One voice.
  function tick(value) {
    voice(pitchAt(value == null ? 0.5 : value), theme.timbre.neutral, vGain(0.55), attackTime(), 0.05);
  }

  // undo: the take-back, typing's micro gesture played backwards (from the
  // keys experiment's backspace). The one mirrored envelope in the grammar:
  // the voice swells in slowly where every other one-shot decays out, bends
  // down an octave (both endpoints on the ladder), and seats fast, so a
  // deletion reads as the insertion reversed, not as a second insertion.
  // Purely tonal and one voice, like tick, its forward twin; it bypasses
  // voice() because that helper only speaks forward.
  function undo(value) {
    if (!running() || vc.n >= VOICE_CAP) return;
    var freq = pitchAt(value == null ? 0.5 : value);
    var peak = vGain(0.55);
    if (evCtx) { freq *= evCtx.oct; peak = clamp(peak * evCtx.gain, 0, 0.2); }
    var t = actx.currentTime;
    var swell = 0.12 * decayScale(); // firm mechanisms take it back quicker
    var cut = attackTime();          // the mirrored attack: fast, never a click
    var g = actx.createGain();
    var s = makeSource(theme.timbre.neutral, g, freq);
    s.freq.setValueAtTime(freq, t);
    s.freq.exponentialRampToValueAtTime(freq * 0.5, t + swell + cut);
    g.gain.setValueAtTime(MIN_GAIN, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, MIN_GAIN * 2), t + swell);
    g.gain.exponentialRampToValueAtTime(MIN_GAIN, t + swell + cut);
    g.connect(bus.master);
    trackNode(s.node, g);
    s.node.start(t);
    s.node.stop(t + swell + cut + 0.05);
  }

  // reject: a beating minor second, quiet and brief. Fired when an action is
  // refused (a locked item, an out-of-range value, a conflict).
  function reject(value) {
    var f = pitchAt(value == null ? 0.3 : value);
    voice(f, theme.timbre.secondary, vGain(0.6), attackTime(), 0.25);
    voice(f * 1.0595, theme.timbre.secondary, vGain(0.6), attackTime(), 0.25);
  }

  // release: a softer, lower-energy seat; the material taps back, damped.
  function release(value) {
    contact(0.45, 0, true);
    voice(pitchAt(value == null ? 0.4 : value), theme.timbre.neutral, vGain(0.55), attackTime() * 1.5, 0.22 * decayScale());
  }

  // --- Drones (continuous change) -------------------------------------------

  // Intensity is the drone's second axis: 0..1, nominal at 0.5. Pitch carries
  // the value; intensity carries the energy of the gesture (velocity, scale,
  // pressure), riding the drone's gain. Omit it and the drone holds nominal.
  function droneLevel(base, intensity) {
    // NaN rides clamp into setTargetAtTime, so an app computing intensity as
    // delta/dt and hitting a zero-time pointermove must land on nominal, not throw.
    if (intensity == null || typeof intensity !== 'number' || !isFinite(intensity)) return base;
    return clamp(base * (0.5 + clamp(intensity, 0, 1)), MIN_GAIN * 2, 0.2);
  }

  var droneApi = {
    start: function (id, value, intensity) {
      if (!running() || drones[id]) { droneApi.move(id, value, intensity); return; }
      if (vc.n >= VOICE_CAP) return;
      var ctx = ctxFor('drone');
      var t = actx.currentTime;
      var g = actx.createGain();
      var f0 = pitchAt(value == null ? 0.5 : value) * ctx.oct;
      var s = makeSource(theme.timbre.secondary, g, f0);
      s.freq.setValueAtTime(f0, t);
      g.gain.setValueAtTime(MIN_GAIN, t);
      var base = clamp(vGain(0.7) * ctx.gain, MIN_GAIN * 2, 0.2);
      // Onset stiffness follows firmness: crisp mechanisms speak sooner.
      g.gain.exponentialRampToValueAtTime(droneLevel(base, intensity), t + droneOnset());
      g.connect(bus.master);
      trackNode(s.node, g);
      s.node.start(t);
      drones[id] = { osc: s.node, freq: s.freq, gain: g, base: base, noise: s.noise };
    },
    move: function (id, value, intensity) {
      var d = drones[id];
      if (!d || !running()) return;
      var t = actx.currentTime;
      // setTargetAtTime glide: no zipper noise.
      d.freq.setTargetAtTime(pitchAt(value) * ctxFor('drone').oct, t, 0.03);
      if (intensity != null) d.gain.gain.setTargetAtTime(droneLevel(d.base, intensity), t, 0.05);
    },
    stop: function (id) {
      var d = drones[id];
      if (!d) return;
      delete drones[id];
      if (!running()) { try { d.osc.stop(); } catch (e) {} return; }
      var t = actx.currentTime;
      var rel = Math.max(theme.envelope.release, 0.1);
      d.gain.gain.setTargetAtTime(MIN_GAIN, t, rel / 4);
      d.osc.stop(t + rel + 0.3);
    }
  };

  // --- Progress tier (from the meter experiment): loading made audible -------
  // A rising, voice-led progression that resolves exactly at 100%. The lead
  // glides up the ladder with progress; a stepped bass walks the quarters; a
  // reference tone at the resolution tonic swells near the end so its beats
  // against the climbing lead slow to stillness as the run lands. Stateful per
  // id, like the drone API: start / set / done (resolve) / stop (abandon).
  function smoothstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  // The climb spans the upper two-thirds of the ladder, always topped by the high
  // tonic, so 100% resolves onto the same note the reference is holding.
  function progSpan() {
    var l = ladder();
    return { l: l, lo: Math.max(0, Math.floor((l.length - 1) * 0.33)), top: l.length - 1 };
  }
  function leadFreqFor(p) {
    var s = progSpan();
    var f = s.lo + clamp(p, 0, 1) * (s.top - s.lo);
    var i = Math.min(s.top - 1, Math.floor(f));
    return s.l[i] * Math.pow(s.l[i + 1] / s.l[i], f - i); // geometric interp between rungs
  }
  function padFreqFor(p) {
    var s = progSpan();
    if (p >= 1) return s.l[0]; // resolve the bass down to the low tonic
    return s.l[clamp(Math.floor(clamp(p, 0, 1) * 4), 0, Math.min(3, s.l.length - 1))];
  }
  function refFreqFor() { var l = ladder(); return l[l.length - 1]; }
  function progRefGain(p) { return clamp(vGain(0.2) + vGain(0.75) * smoothstep(0.72, 1, p), MIN_GAIN * 2, 0.2); }

  function heldVoice(wave, freq, peak, ramp) {
    var t = actx.currentTime;
    var g = actx.createGain();
    var s = makeSource(wave, g, freq);
    s.freq.setValueAtTime(freq, t);
    g.gain.setValueAtTime(MIN_GAIN, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, MIN_GAIN * 2), t + ramp);
    g.connect(bus.master);
    trackNode(s.node, g);
    s.node.start(t);
    return { osc: s.node, freq: s.freq, gain: g };
  }
  function releaseHeld(v, rel) {
    if (!v) return;
    if (!running()) { try { v.osc.stop(); } catch (e) {} return; }
    var t = actx.currentTime;
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(Math.max(v.gain.gain.value, MIN_GAIN), t);
    v.gain.gain.setTargetAtTime(MIN_GAIN, t, Math.max(rel, 0.05) / 4);
    v.osc.stop(t + rel + 0.3);
  }
  // A milestone tick: a short bright pluck (stronger at the half), the material struck.
  function progTick(strong, oct) {
    var l = ladder();
    var hi = l[Math.min(l.length - 1, Math.round((l.length - 1) * (strong ? 0.5 : 0.62)))] * oct;
    voice(hi, theme.timbre.neutral, vGain(strong ? 0.5 : 0.35), attackTime(), strong ? 0.08 : 0.05);
    if (strong) voice(l[0] * oct, theme.timbre.neutral, vGain(0.45), attackTime(), 0.1);
    contact(strong ? 0.55 : 0.4);
  }

  var progressApi = {
    start: function (id, value) {
      if (!running()) return;
      if (progressV[id]) { progressApi.set(id, value); return; }
      if (vc.n >= VOICE_CAP - 3) return;
      var ctx = ctxFor('progress');
      var p = typeof value === 'number' && isFinite(value) ? clamp(value, 0, 1) : 0;
      progressV[id] = {
        p: p, ctx: ctx,
        lead: heldVoice(theme.timbre.secondary, leadFreqFor(p) * ctx.oct, clamp(vGain(1.3) * ctx.gain, MIN_GAIN * 2, 0.2), 0.09),
        pad: heldVoice(theme.timbre.neutral, padFreqFor(p) * ctx.oct, clamp(vGain(0.75) * ctx.gain, MIN_GAIN * 2, 0.2), 0.12),
        ref: heldVoice(theme.timbre.neutral, refFreqFor() * ctx.oct, progRefGain(p) * ctx.gain, 0.15)
      };
    },
    // hold: the indeterminate case, still working with no ETA. The lead rocks
    // between two neighbouring rungs; no reference tone, because a reference
    // is a promise of resolution and this state makes none. A later set()
    // converts the hold into a determinate run; done/stop end it as usual.
    hold: function (id) {
      if (!running()) return;
      var pv = progressV[id];
      if (pv && pv.holdTimer) return;
      var ctx = pv ? pv.ctx : ctxFor('progress');
      if (!pv) {
        if (vc.n >= VOICE_CAP - 2) return;
        var l = ladder();
        var i = Math.floor((l.length - 1) * 0.5);
        pv = progressV[id] = {
          p: 0, ctx: ctx,
          lead: heldVoice(theme.timbre.secondary, l[i] * ctx.oct, clamp(vGain(1.1) * ctx.gain, MIN_GAIN * 2, 0.2), 0.09),
          pad: heldVoice(theme.timbre.neutral, l[0] * ctx.oct, clamp(vGain(0.6) * ctx.gain, MIN_GAIN * 2, 0.2), 0.12),
          ref: null
        };
      } else if (pv.ref) {
        pv.ref.gain.gain.setTargetAtTime(MIN_GAIN, actx.currentTime, 0.15);
      }
      var flip = false;
      pv.holdTimer = setInterval(function () {
        if (!running() || !progressV[id]) return;
        var l2 = ladder();
        var j = Math.floor((l2.length - 1) * 0.5);
        flip = !flip;
        pv.lead.freq.setTargetAtTime(l2[Math.min(l2.length - 1, j + (flip ? 1 : 0))] * pv.ctx.oct, actx.currentTime, 0.09);
      }, 560);
    },
    set: function (id, value) {
      var pv = progressV[id];
      if (!pv || !running()) return;
      if (pv.holdTimer) { clearInterval(pv.holdTimer); pv.holdTimer = null; }
      var p = typeof value === 'number' && isFinite(value) ? clamp(value, 0, 1) : pv.p;
      var t = actx.currentTime;
      // A hold has no reference voice; a determinate run promises resolution, so it gains one here.
      if (!pv.ref) pv.ref = heldVoice(theme.timbre.neutral, refFreqFor() * pv.ctx.oct, Math.max(progRefGain(p) * pv.ctx.gain, MIN_GAIN * 2), 0.15);
      pv.lead.freq.setTargetAtTime(leadFreqFor(p) * pv.ctx.oct, t, 0.03);
      pv.pad.freq.setTargetAtTime(padFreqFor(p) * pv.ctx.oct, t, 0.06);
      pv.ref.gain.gain.setTargetAtTime(Math.max(MIN_GAIN, progRefGain(p) * pv.ctx.gain), t, 0.1);
      var ms = [0.25, 0.5, 0.75];
      for (var i = 0; i < ms.length; i++) if (pv.p < ms[i] && p >= ms[i]) progTick(ms[i] === 0.5, pv.ctx.oct);
      pv.p = p;
    },
    // done: resolve. Release the held voices, seat the material, land the tonic triad.
    done: function (id) {
      var pv = progressV[id];
      if (!pv) return;
      delete progressV[id];
      if (pv.holdTimer) clearInterval(pv.holdTimer);
      releaseHeld(pv.lead, 0.5); releaseHeld(pv.pad, 0.5); releaseHeld(pv.ref, 0.5);
      if (!running()) return;
      contact(0.8);
      // The landing triad shares commit's scale-aware shape, rooted at the tonic.
      var freqs = triadAt(ladder().length - 1);
      var t = actx.currentTime;
      for (var i = 0; i < freqs.length; i++) {
        voice(freqs[i] * pv.ctx.oct, i % 2 ? theme.timbre.secondary : theme.timbre.neutral,
          clamp(vGain(i === 0 ? 1 : 0.7) * pv.ctx.gain, MIN_GAIN * 2, 0.2), attackTime(), 0.5 * decayScale(), t + i * 0.04);
      }
    },
    // stop: abandon. The run decays out over the theme release, never resolving.
    stop: function (id) {
      var pv = progressV[id];
      if (!pv) return;
      delete progressV[id];
      if (pv.holdTimer) clearInterval(pv.holdTimer);
      var rel = Math.max(theme.envelope.release, 0.1);
      releaseHeld(pv.lead, rel); releaseHeld(pv.pad, rel); releaseHeld(pv.ref, rel);
    }
  };

  // --- Notifications: fixed shape and resolution per kind, fresh notes every fire ---

  function rung(i) { var l = ladder(); return l[clamp(i, 0, l.length - 1)]; }
  function ladderLen() { return ladder().length; }
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  // Indices of resolved degrees (root or perfect fifth) near an index, searching
  // upward. Interval-based, not position-based, so it lands correctly on any
  // scale (whole-tone has no fifth, so it resolves to the root).
  function resolvedNear(i) {
    var intervals = SCALES[theme.key.scale] || SCALES.majorPentatonic;
    var per = intervals.length;
    for (var j = i; j < ladderLen(); j++) {
      var iv = intervals[((j % per) + per) % per];
      if (iv === 0 || iv === 7) return j;
    }
    return ladderLen() - 1;
  }

  // success: ascends 3-4 rungs, lands resolved, with a quiet fifth and octave shimmer.
  function success() {
    if (!running()) return;
    var steps = randInt(3, 4);
    var i = randInt(2, Math.max(3, ladderLen() - steps * 2 - 4));
    var t = actx.currentTime;
    for (var s = 0; s < steps; s++) {
      i += randInt(1, 2);
      var last = s === steps - 1;
      var idx = last ? resolvedNear(i) : i;
      var f = rung(idx);
      voice(f, theme.timbre.secondary, vGain(last ? 1 : 0.75), attackTime(), last ? 0.4 : 0.14, t + s * 0.09);
      if (last) {
        voice(f * 1.5, theme.timbre.neutral, vGain(0.4), attackTime(), 0.4, t + s * 0.09 + 0.03);
        voice(f * 2, theme.timbre.neutral, vGain(0.3), attackTime(), 0.4, t + s * 0.09 + 0.06);
      }
    }
  }

  // info: a calm one- or two-note consonant ping, no direction.
  function info() {
    if (!running()) return;
    var i = randInt(Math.floor(ladderLen() * 0.4), Math.floor(ladderLen() * 0.7));
    var f = rung(i);
    var t = actx.currentTime;
    voice(f, theme.timbre.neutral, vGain(0.8), attackTime(), 0.25, t);
    if (Math.random() < 0.6) {
      var ratio = [4 / 3, 1.5, 2][randInt(0, 2)];
      voice(f * ratio, theme.timbre.neutral, vGain(0.5), attackTime(), 0.25, t + 0.11);
    }
  }

  // warning: oscillates two neighbouring rungs, ends unresolved with a faint beat.
  function warning() {
    if (!running()) return;
    var i = randInt(Math.floor(ladderLen() * 0.35), Math.floor(ladderLen() * 0.65));
    var a = rung(i), b = rung(i + 1);
    var t = actx.currentTime;
    var swings = randInt(3, 4);
    for (var s = 0; s < swings; s++) {
      voice(s % 2 ? b : a, theme.timbre.secondary, vGain(0.7), attackTime(), 0.12, t + s * 0.1);
    }
    var end = s % 2 ? b : a;
    voice(end, theme.timbre.secondary, vGain(0.7), attackTime(), 0.35, t + s * 0.1);
    voice(end * 1.02, theme.timbre.secondary, vGain(0.35), attackTime(), 0.35, t + s * 0.1);
  }

  // error: falls from a high rung to a low resolved one and lands in a beating cluster.
  // The one place the charged waveform is spent.
  function error() {
    if (!running()) return;
    var i = randInt(Math.floor(ladderLen() * 0.7), ladderLen() - 1);
    var t = actx.currentTime;
    var steps = randInt(3, 4);
    for (var s = 0; s < steps; s++) {
      var idx = s === steps - 1 ? (resolvedNear(2) || 0) : i - Math.floor((i * s) / steps);
      var f = rung(idx);
      var last = s === steps - 1;
      voice(f, theme.timbre.charged, vGain(last ? 0.8 : 0.6), attackTime(), last ? 0.45 : 0.13, t + s * 0.1);
      if (last) voice(f * 1.045, theme.timbre.charged, vGain(0.5), attackTime(), 0.45, t + s * 0.1);
    }
  }

  // --- Signature (v0.7): the brand moment -----------------------------------
  // The one deliberate exception to "never the same waveform": a sonic logo is
  // fixed, so the motif comes from a seeded PRNG (theme.signature.seed mixed
  // with a hash of the theme name) and the same theme plays the same signature
  // every time. Shape: the material struck, a low tonic bed, a seeded phrase
  // climbing the ladder, landing resolved on the scale's own triad; about two
  // seconds. Opt-in only (app launch, sign-in): never ambient, never repeated
  // in-session, and the governor thins accidental spam like everything else.
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function signature() {
    if (!running()) return;
    var seed = theme.signature && typeof theme.signature.seed === 'number' ? theme.signature.seed : 0;
    var h = 0, nm = String(theme.name || 'Anti');
    for (var i = 0; i < nm.length; i++) h = (h * 31 + nm.charCodeAt(i)) >>> 0;
    var rnd = mulberry((h ^ Math.imul(seed + 1, 2654435761)) >>> 0);
    var l = ladder();
    var t0 = actx.currentTime;
    // A logo is fixed. For the length of the signature, the material layer's
    // randomness (the contact detune, the crinkle scatter, the noise burst)
    // draws from its own seeded stream and the click buffer is rebuilt from it,
    // so the same theme renders bit-identically every time. The melody was
    // already deterministic (its own mulberry above); only the material was
    // leaking Math.random. Both are restored in finally, so live interaction
    // keeps its variety.
    var prevRng = rng, prevClick = clickBuf, prevNoise = noiseBuf;
    rng = mulberry((h ^ Math.imul(seed + 2, 2246822519)) >>> 0);
    clickBuf = makeClickBuf(actx);
    noiseBuf = makeNoiseBuf(actx); // a noise-timbre logo must render bit-identically too
    // The logo gets a fuller stage than an interaction event; the limiter still rules.
    VOICE_CAP += 10;
    try {
      contact(0.7, t0);
      voice(l[0], theme.timbre.neutral, vGain(0.5), 0.2, 1.5, t0); // the bed
      var steps = 4 + Math.floor(rnd() * 2);
      var idx = 2 + Math.floor(rnd() * 3);
      var t = t0 + 0.14;
      for (var s = 0; s < steps; s++) {
        var last = s === steps - 1;
        if (last) idx = resolvedNear(Math.min(idx, l.length - 4));
        voice(rung(idx), s % 2 ? theme.timbre.secondary : theme.timbre.neutral,
          vGain(last ? 0.9 : 0.65), attackTime(), (last ? 0.7 : 0.3) * decayScale(), t);
        if (!last) idx += 1 + Math.floor(rnd() * 2);
        t += 0.16 + rnd() * 0.09;
      }
      contact(0.85, t);
      // The melody already supplies the root, so the triad's own root sits back.
      var freqs = triadAt(idx);
      for (var j = 0; j < freqs.length; j++) {
        voice(freqs[j], j % 2 ? theme.timbre.secondary : theme.timbre.neutral,
          vGain(j === 0 ? 0.6 : 0.7), attackTime(), 0.9 * decayScale(), t + j * 0.05);
      }
    } finally {
      VOICE_CAP -= 10;
      rng = prevRng;
      clickBuf = prevClick;
      noiseBuf = prevNoise;
    }
  }

  // --- Public API -----------------------------------------------------------

  var EVENTS = { grab: grab, tick: tick, undo: undo, commit: commit, reject: reject, release: release, success: success, info: info, warning: warning, error: error, signature: signature };
  EVENTS.invalid = reject; // back-compat alias: 'invalid' was renamed to 'reject' in v0.3.1

  function play(name, opts) {
    // Own-key lookup: EVENTS['__proto__'] would resolve to Object.prototype,
    // which is truthy, passes the !fn guard, and then throws mid-flight.
    var fn = ownKey(EVENTS, name) ? EVENTS[name] : null;
    if (!fn || !running()) return;
    evCtx = ctxFor(name);
    evCtx.gain *= repGain(name);
    try {
      fn(opts && typeof opts.value === 'number' ? opts.value : undefined);
    } finally {
      evCtx = null;
    }
  }

  // Offline render: schedule one event into an OfflineAudioContext with a fresh
  // bus, resolve with the rendered AudioBuffer. Event scheduling is synchronous,
  // so the live graph is swapped out only for the duration of this call; the
  // voice counter object travels with each node's cleanup closure, so late
  // onended callbacks from a render never corrupt the live count.
  function render(name, opts) {
    opts = opts || {};
    var fn = ownKey(EVENTS, name) ? EVENTS[name] : null;
    // typeof guards, not window.: a server render or worker has no window,
    // and this function's contract is a rejected promise, never a throw.
    var OAC = (typeof OfflineAudioContext !== 'undefined' && OfflineAudioContext) ||
      (typeof webkitOfflineAudioContext !== 'undefined' && webkitOfflineAudioContext) || null;
    if (!fn) return Promise.reject(new Error('Unknown event: ' + name));
    if (!OAC) return Promise.reject(new Error('OfflineAudioContext unavailable'));
    var sr = opts.sampleRate || 48000;
    var dur = clamp(opts.duration || 2.5, 0.5, 10);
    var octx = new OAC(1, Math.ceil(sr * dur), sr);
    var prevActx = actx, prevBus = bus, prevClick = clickBuf, prevNoise = noiseBuf, prevVc = vc;
    actx = octx;
    bus = makeBus(octx, false);
    clickBuf = makeClickBuf(octx);
    noiseBuf = makeNoiseBuf(octx);
    vc = { n: 0 };
    offline = true;
    evCtx = ctxFor(name);
    try {
      fn(typeof opts.value === 'number' ? opts.value : undefined);
    } catch (e) {
      // A scheduling failure keeps the promise contract: callers wrote
      // render().catch() and must not need a synchronous try as well.
      return Promise.reject(e);
    } finally {
      evCtx = null;
      offline = false;
      actx = prevActx;
      bus = prevBus;
      clickBuf = prevClick;
      noiseBuf = prevNoise;
      vc = prevVc;
    }
    return octx.startRendering();
  }

  // Declarative binding: data-anti (click), data-anti-hover, data-anti-down, data-anti-up.
  // Optional data-anti-value="0..1" pitches the event.
  function bind(root) {
    // Nothing to wire where there is no document (a server render calling this
    // in a component body), and a thrown ReferenceError there would be the one
    // way this engine could break a page it is not even making sound on.
    var scope = root || (typeof document !== 'undefined' ? document : null);
    if (!scope) return;
    function val(el) {
      var v = parseFloat(el.getAttribute('data-anti-value'));
      return isNaN(v) ? undefined : { value: v };
    }
    function wire(attr, domEvent) {
      var els = scope.querySelectorAll('[' + attr + ']');
      for (var i = 0; i < els.length; i++) {
        (function (el) {
          if (el.__anti && el.__anti[attr]) return;
          el.__anti = el.__anti || {};
          el.__anti[attr] = true;
          el.addEventListener(domEvent, function () { play(el.getAttribute(attr), val(el)); });
        })(els[i]);
      }
    }
    wire('data-anti', 'click');
    wire('data-anti-hover', 'pointerenter');
    wire('data-anti-down', 'pointerdown');
    wire('data-anti-up', 'pointerup');
  }

  // --- Listener etiquette: the off switch and the volume that make leaving the
  // engine on the default a real choice. Both persist across sessions.

  function setEnabled(on) {
    on = !!on;
    if (!on && enabled) silence(); // release held voices gracefully before going silent
    enabled = on;
    try { window.localStorage.setItem('anti.enabled', enabled ? 'true' : 'false'); } catch (e) {}
    return enabled;
  }
  function setVolume(v) {
    // NaN passes a typeof check and rides clamp into setTargetAtTime, the
    // same edge the drone intensity guards; a non-finite volume keeps the
    // current one rather than throwing on a live bus.
    if (typeof v !== 'number' || !isFinite(v)) return userVol;
    userVol = clamp(v, 0, 1);
    try { window.localStorage.setItem('anti.volume', String(userVol)); } catch (e) {}
    if (bus && actx && !offline) bus.userGain.gain.setTargetAtTime(userVol, actx.currentTime, 0.03);
    return userVol;
  }

  // setTheme merges a partial over the current theme. opts.replace instead
  // rebuilds from the built-in default, so stale keys (a previous theme's
  // event overrides) cannot linger: what preset switching wants.
  function setTheme(partial, opts) {
    if (opts && opts.replace) {
      theme = deepMerge(deepMerge({}, DEFAULT_THEME), partial || {});
    } else {
      deepMerge(theme, partial || {});
    }
    sanitizeTheme();
    ladderCache = null;
    // Whenever there is a bus, not only while the engine is sounding. Gated
    // on running(), a theme set with the listener's switch off never reached
    // the bus, and nothing caught it up when the switch came back on: the
    // voices read the new theme and the bus kept the old brightness and
    // master. A parameter set on a suspended context lands when it resumes,
    // so there is nothing to wait for.
    if (actx && bus) {
      var t = actx.currentTime;
      bus.filter.frequency.setTargetAtTime(theme.timbre.brightness, t, 0.05);
      bus.master.gain.setTargetAtTime(theme.gain.master, t, 0.05);
      // Retype only oscillator drones, and only to an oscillator wave: a noise
      // drone has no .type, and assigning 'noise' to an OscillatorNode throws.
      if (theme.timbre.secondary !== 'noise') {
        for (var id in drones) { if (!drones[id].noise) drones[id].osc.type = theme.timbre.secondary; }
      }
    }
  }

  // Stop everything currently sounding: every held drone, every progress run.
  // One-shots are left to finish, being already on their way out.
  // This is the contract behind a view that can be left mid-gesture (a room
  // switch, a route change, a closing panel): the caller does not have to know
  // which ids it started, only that nothing may keep ringing after it goes.
  // Keys are snapshotted first because both stops delete as they go.
  function silence() {
    Object.keys(drones).forEach(function (id) { droneApi.stop(id); });
    Object.keys(progressV).forEach(function (id) { progressApi.stop(id); });
  }

  return {
    version: VERSION,
    get ready() { return running(); },
    play: play,
    bind: bind,
    drone: droneApi,
    progress: progressApi,
    silence: silence,
    setTheme: setTheme,
    getTheme: function () { return deepMerge({}, theme); },
    materials: ['none'].concat(Object.keys(MATERIALS)),
    scales: Object.keys(SCALES),
    // The grammar, in its canonical order: what this engine can be asked to
    // play. The 'invalid' back-compat alias is left out, so anything that
    // enumerates the events (an editor, a rendered pack, a spec sheet) gets
    // the real list and gets it from here rather than keeping its own copy.
    events: Object.keys(EVENTS).filter(function (n) { return n !== 'invalid'; }),
    setEnabled: setEnabled,
    get enabled() { return enabled; },
    setVolume: setVolume,
    get volume() { return userVol; },
    render: render,
    resume: unlock
  };
/* @anti:tail */
});
