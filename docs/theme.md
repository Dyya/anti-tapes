# Theme format v0.9

A theme is one JSON object that retunes the entire grammar.

- `themes/default.theme.json`: canonical, matches the engine's built-in default.
- `themes/glass.theme.json`: the material dimension.
- `themes/wood.theme.json`: a dark theme with event overrides.
- `themes/digital.theme.json`: the articulation dimension (chirped, synthetic).
- `themes/tape.theme.json`: the noise timbre (hiss as identity).

`Anti.setTheme(partial)` deep-merges over the current theme, live (the bus filter and gains update without a restart). `Anti.setTheme(themeObj, { replace: true })` rebuilds from the built-in default, so nothing from the previous theme (its event overrides, say) lingers: use it to switch whole themes.

`engine/anti-schema.js` is the same format as data: one row per tunable modifier field (dotted path, control kind, label, editing range, format), except the signature seed and per-event overrides. An editor built over the format should read that file, not restate this one, and read `Anti.events` (canonical order, without the deprecated `invalid` alias) rather than copy the event list.

```json
{
  "name": "Anti default",
  "key": {
    "root": "C",
    "scale": "majorPentatonic",
    "octaves": [3, 6]
  },
  "timbre": {
    "neutral": "sine",
    "secondary": "triangle",
    "charged": "sawtooth",
    "brightness": 2400,
    "articulation": "none"
  },
  "material": {
    "type": "none",
    "amount": 0.7
  },
  "envelope": {
    "firmness": 0.5,
    "release": 0.4
  },
  "gain": {
    "voice": 0.1,
    "master": 0.9
  },
  "etiquette": {
    "repetition": 0.5
  },
  "signature": {
    "seed": 0
  },
  "events": {}
}
```

## Fields

- **key.root**: pitch letter, `C` through `B` with sharps (`F#`). The tonal center every commit resolves to.
- **key.scale**: `majorPentatonic`, `minorPentatonic`, `major`, `minor`, `dorian`, `mixolydian`, `lydian`, or `wholeTone` (`Anti.scales` lists them). Every pitched event quantizes to this ladder. The pentatonics have no wrong note (safest); the seven-note modes and whole-tone widen the emotional range. Every scale lands resolved (root or fifth; whole-tone on the root).
- **key.octaves**: `[low, high]`, the inclusive range of the ladder. Wider means more travel for continuous values.
- **timbre.neutral / secondary**: waveforms for ordinary voices (plucks, drones). Keep them plain (sine, triangle), or `noise` for a breathy identity.
- **timbre.charged**: the reserved rich waveform (sawtooth, square), spent only on the most urgent moment (the error fall), like a single accent color.
- Any timbre slot may be `noise` (v0.9): looped white noise through a bandpass centered on the note, so pitch still carries the value. The engine compensates for its lower level within the per-voice cap. The tape theme is the reference.
- **timbre.brightness**: master lowpass cutoff in Hz (gentle, Q 0.5). The biggest character knob: 1200 is dark and woody, 2400 neutral, 5000 airy and glassy.
- **timbre.articulation** (v0.6): `none` or `chirp`. Chirp glides every one-shot voice down an octave into its note in tens of milliseconds (faster when firm), both endpoints on the ladder: synthetic, still in key. Drones and held progress voices are unaffected. See `themes/digital.theme.json`.
- **material.type**: `none`, `glass`, `wood`, `rubber`, `metal`, `ceramic`, `plastic`, `felt`, `membrane`, `stone`, or `paper` (`Anti.materials` lists them). A modal resonator bank (a filtered noise transient plus damped partials) under the contact events: grab strikes it, release taps it short and damped. `none` stays purely tonal. Glass rings high and bell-like, wood is a warm short knock, rubber a muffled thud, metal a long inharmonic clang, ceramic a porcelain tink, plastic a dull hollow tok, felt a soft tap, membrane a struck drum head, stone (v0.6) a tight mineral clack, heavily damped. Paper (v0.6) is scatter-voiced: its recipe's `crinkle` field scatters a few tiny filtered noise bursts across a few tens of ms over one weak flap mode, so no two touches match. Glass, wood, rubber and metal are tuned by ear; the rest start from acoustics.
- **material.amount**: 0..1, the material layer against the tonal grammar. 0 mutes it; around 0.7 colors the contact without burying the pitch.
- **envelope.firmness**: 0..1, one knob for the whole mechanism. Soft (0): slower attacks, longer decays, rounder plucks, a darker, longer material transient, upper partials rolled off, slower drone onset. Crisp (1): 6 ms attacks, short decays, a brighter, shorter transient, full partials, near-instant drones.
- **envelope.release**: seconds a drone takes to decay after release. Never cut.
- **gain.voice**: peak per-voice gain (house range 0.05-0.16).
- **gain.master**: master bus gain.
- **etiquette.repetition** (v0.5): 0..1, the repetition governor. Fast repeats of the same event get quieter and recover over about a second of quiet. 0 disables, 0.5 is the default, 1 thins repeats to a quarter of nominal. Offline render is exempt, so exported packs stay full voice.
- **signature.seed** (v0.7): the signature's variation seed, a non-negative integer. `Anti.play('signature')` is the brand moment: a roughly two-second motif (the material struck, a low tonic bed, a phrase climbing the ladder, landing on the scale's triad), generated deterministically from this seed and a hash of the theme name. Like a logo, a theme's motif and generated source buffers are fixed; browser rendering can introduce small sample differences, so WAV bytes are not guaranteed identical. Step the seed to browse variations. Fire it at launch or sign-in only: never ambient, never repeated in a session.
- **events**: per-event partial overrides, keyed by event name (`grab`, `tick`, `undo`, `commit`, `reject`, `release`, `success`, `info`, `warning`, `error`, `signature`, plus `drone` for the continuous layer and `progress` for the progress tier). Each entry may set:
  - `gain`: multiplier on that event's voice gains (0..2).
  - `octave`: integer pitch shift in octaves (-3..3), e.g. to lift notifications out of a dark ladder.
  - `material`: overrides `material.amount` for that event (0 disables it there). One-shot contact events only; `drone` and `progress` read `octave` and `gain`.

  Example, abridged from the wood theme: `"events": { "success": { "octave": 1 }, "grab": { "material": 1 } }`.

## Grammar events the theme drives

Core: `grab`, `tick`, `undo`, `commit`, `reject`, `release`, plus the drone API (`Anti.drone.start/move/stop`). Notifications: `success`, `info`, `warning`, `error` (a fixed contour and resolution per kind, fresh notes every fire).

`tick` (v0.5) is the positional micro event: focus moves, detents, list traversal, a reorder's insertion point, a d-pad step. The most-fired sound, it is quieter and shorter than `grab` (one voice), and the governor thins it fastest.

`undo` (v0.8) is the take-back: a deletion, an undone edit, a retracted step. Tick's mirror and the grammar's one reversed envelope: one neutral voice swells in slowly, bends down an octave (both endpoints on the ladder), and seats fast, so a removal sounds like the insertion reversed. Fire it at the removed item's value.

`commit` (and the progress tier's landing) builds its triad from the theme's scale (v0.5): the scale's first third (minor or major), the fifth (whole-tone, which has none, takes its augmented fifth), and the octave. Minor themes commit minor.

The drone API takes an optional third argument, `intensity` (0..1, nominal 0.5): the gesture's energy (velocity, pinch scale, pressure), carried on the drone's level while pitch carries the value. `Anti.drone.move('id', value, velocity)` makes a fling louder than a nudge.

Progress tier (`Anti.progress.start/hold/set/done/stop`): loading made audible. A lead voice glides up the ladder with progress (0..1), a stepped bass walks the four quarters, and a reference tone at the resolution tonic swells over the last stretch, its beats against the lead slowing to stillness. The quarters tick, the half stronger. `done` lands the tonic triad; `stop` decays out over `envelope.release` without resolving (an abandoned load). It reads the same key, timbre and material as everything else, plus `events.progress`.

`hold` (v0.5) is the indeterminate case: still working, no ETA. The lead rocks between two neighbouring rungs with no reference tone, since a reference promises resolution. A later `set` turns it into a determinate run (the reference fades in); `done` and `stop` end it as usual. Use it for spinners, syncing, and a voice interface's thinking state.

## Offline render (v0.3)

`Anti.render(event, { value, duration, sampleRate })` renders any one-shot event or notification under the current theme in an OfflineAudioContext and resolves with a mono AudioBuffer (defaults: 2.5 s, 48 kHz). Event overrides apply. No gesture or live context is needed. Drone and progress are live-only.

## Listener etiquette (v0.4)

The listener's controls are separate from the theme, which is the designer's.

- `Anti.setEnabled(bool)` / `Anti.enabled`: the off switch. Disabling releases held drone and progress voices gracefully, then `play` no-ops. Persisted in `localStorage` (`anti.enabled`).
- `Anti.setVolume(0..1)` / `Anti.volume`: the listener's volume, a final gain separate from `gain.master` (the theme's level). Persisted (`anti.volume`). Offline render ignores it.

## Loudness safety (v0.4)

The bus ends in a glue compressor, a brickwall limiter (fast attack, near-0 ceiling) and a hard-clip stage. With bounded per-voice gains and the voice cap, no theme or stack of events can spike past the ceiling.

## Planned

- **JSON Schema** file for validation. `anti-tapes/schema` already describes the format as data; a JSON Schema derived from it may follow.
