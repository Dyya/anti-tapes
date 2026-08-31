# Theme format v0.9


A theme is one JSON object that retunes the entire grammar. `themes/default.theme.json` is canonical and matches the engine's built-in default; `themes/glass.theme.json` shows the material dimension in use, `themes/wood.theme.json` shows a dark theme with event overrides, `themes/digital.theme.json` shows the articulation dimension (the chirped, synthetic identity), `themes/tape.theme.json` shows the noise timbre (hiss as identity). `Anti.setTheme(partial)` deep-merges a partial theme over the current one, live (the bus filter and gains update without a restart). `Anti.setTheme(themeObj, { replace: true })` instead rebuilds from the built-in default, so keys from a previous theme (its event overrides, say) cannot linger: use this when switching whole themes.

This document is the prose reference; `engine/anti-schema.js` is the same format as machine-readable data (one row per tunable modifier field: dotted path, control kind, label, editing range, format; the signature seed and the per-event overrides are documented here but carry no schema row). Anything that builds an editor or a sheet over the format should read that file rather than restate this one, which is how the studio's theme panel is built. The grammar's event list has the same rule: read `Anti.events` (canonical order, without the deprecated `invalid` alias) instead of keeping a copy.

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
- **key.scale**: one of `majorPentatonic`, `minorPentatonic`, `major`, `minor`, `dorian`, `mixolydian`, `lydian`, `wholeTone` (`Anti.scales` lists them). All pitched events quantize to this ladder, so anything the engine plays stays tuneful. The pentatonics have no wrong note (safest); the seven-note modes and whole-tone widen the emotional range. Every scale still lands resolved (root or fifth; whole-tone resolves to the root).
- **key.octaves**: `[low, high]` inclusive range the ladder spans. Wider = more travel for continuous values.
- **timbre.neutral / secondary**: waveforms for ordinary voices (plucks, drones). Keep these plain (sine, triangle), or `noise` for a breath-voiced identity.
- **timbre.charged**: the reserved rich waveform (sawtooth, square). The engine only spends it on the most attention-demanding moment (the error fall). The audio analogue of a single accent color.
- Any slot may be `noise` (v0.9): looped white noise through a bandpass centered on the note, so pitch still carries the value and the whole grammar survives as colored air: ticks hiss at their rung, drones become breath that glides, commit is a chord of air. Quieter per band than an oscillator, so the engine compensates inside the per-voice cap. The tape theme is the reference use.
- **timbre.brightness**: master lowpass cutoff in Hz (gentle, Q 0.5). The single biggest character knob: 1200 is dark and woody, 2400 is the house neutral, 5000 is airy and glassy.
- **timbre.articulation** (v0.6): `none` or `chirp`. Chirp glides every one-shot voice down an octave into its target note, the fall over in tens of milliseconds (faster when firm). Both endpoints sit on the ladder, so the identity turns synthetic and sci-fi without ever going out of key: the laser, done politely. Drones and held progress voices are unaffected. `themes/digital.theme.json` is the demonstration.
- **material.type**: `none`, `glass`, `wood`, `rubber`, `metal`, `ceramic`, `plastic`, `felt`, `membrane`, `stone`, or `paper` (`Anti.materials` lists them). A modal resonator bank (a filtered noise transient plus damped partials) layered under the contact events: grab strikes it, release taps back damped and short. `none` keeps the purely tonal identity. Glass rings high and bell-like, wood is a warm short knock, rubber a muffled thud, metal a long inharmonic clang; ceramic is a tight porcelain tink, plastic a dull hollow tok, felt a soft muffled tap, membrane a struck drum head; stone (v0.6) is a tight mineral clack, dense and heavily damped; paper (v0.6) is the crinkle, the first material voiced by a scatter of micro-impulses (its recipe carries a `crinkle` field: a handful of tiny filtered noise bursts randomly placed across a few tens of ms, so no two touches are alike) over one weak flap mode. (The glass, wood, rubber and metal recipes are ear-tuned; the v0.4 and v0.6 additions start from acoustics.)
- **material.amount**: 0..1 blend of the material layer against the tonal grammar. 0 mutes it entirely; around 0.7 the material colors the contact without burying the pitch.
- **envelope.firmness**: 0..1, the whole-mechanism model. Soft (0) = slower attacks, longer decays, rounder plucks, a darker and longer material transient, upper partials rolled off, slower drone onset. Crisp (1) = 6 ms attacks, short decays, a brighter and shorter transient, full partial spectrum, drones that speak almost immediately. One knob, the whole mechanism follows.
- **envelope.release**: seconds a drone takes to decay out on release. Never cut.
- **gain.voice**: peak per-voice gain (house etiquette range 0.05-0.16).
- **gain.master**: master bus gain.
- **etiquette.repetition**: 0..1, the repetition governor (v0.5). Fast repeats of the same event heat up and thin out (each repeat a little quieter), cooling back to full voice over about a second of quiet. Annoyance safety, enforced in the engine the way the limiter enforces loudness: a sound can be beautiful once and unbearable at 10 Hz. 0 disables, 0.5 is the default, 1 thins repeats down to a quarter of nominal. Offline render is exempt, so exported packs are always full voice.
- **signature.seed** (v0.7): the signature's variation seed, a non-negative integer. The signature (`Anti.play('signature')`) is the brand moment: a roughly two-second motif (the material struck, a low tonic bed, a phrase climbing the ladder, landing resolved on the scale's own triad) generated deterministically from this seed mixed with a hash of the theme name. The one deliberate exception to "never the same waveform": a sonic logo is fixed, so the same theme plays the same signature every time. Step the seed to browse variations; the chosen one saves with the theme and renders into the WAV pack. Fire it at app launch or sign-in only: never ambient, never repeated in-session.
- **events**: per-event partial overrides, keyed by event name (`grab`, `tick`, `undo`, `commit`, `reject`, `release`, `success`, `info`, `warning`, `error`, `signature`, plus `drone` for the continuous layer and `progress` for the progress tier). Each entry may set:
  - `gain`: multiplier on that event's voice gains (0..2).
  - `octave`: integer pitch shift in octaves (-3..3), e.g. lift notifications out of a dark ladder.
  - `material`: overrides `material.amount` for that event alone (0 disables the material there). Applies to the one-shot contact events; the progress and drone layers read `octave` and `gain`.

  Example, abridged from the wood theme: `"events": { "success": { "octave": 1 }, "grab": { "material": 1 } }`.

## Grammar events the theme drives

Core: `grab`, `tick`, `undo`, `commit`, `reject`, `release`, plus the continuous drone API (`Anti.drone.start/move/stop`). Notifications: `success`, `info`, `warning`, `error` (fixed contour and resolution per kind, notes generated fresh every fire).

`tick` (v0.5) is the positional micro event: focus moves, detents, list traversal, an insertion point crossed during reorder, a d-pad step. It is the most-fired sound in a real interface, so it is quieter and shorter than `grab` (one voice, felt more than heard) and the repetition governor thins it fastest.

`undo` (v0.8) is the take-back: a deletion, an undone edit, a retracted step. It is tick's mirror, and the one mirrored envelope in the grammar (it began as backspace on a typing surface): one neutral voice that swells in slowly where every other one-shot decays out, bends down an octave (both endpoints on the ladder), and seats fast, so removing something sounds like inserting it reversed, not like inserting something else. Fire it at the removed item's value and a deleted letter gives back the exact seat it took.

`commit` (and the progress tier's landing) builds its triad from the theme's own scale (v0.5): the first third the scale offers (minor or major), the fifth (whole-tone, which has none, gets its augmented fifth), and the octave. Minor themes commit minor; the resolution stays in character.

The drone API takes an optional third argument, `intensity` (0..1, nominal 0.5): the second axis for continuous gestures. Pitch carries the value; intensity carries the energy of the gesture (velocity, pinch scale, pressure), riding the drone's level. `Anti.drone.move('id', value, velocity)` makes a fling audibly more energetic than a nudge.

Progress tier (`Anti.progress.start/hold/set/done/stop`): loading made audible. A lead voice glides up the ladder with progress (0..1), a stepped bass walks the four quarters, and a reference tone held at the resolution tonic swells over the last stretch so its beats against the climbing lead slow to stillness. `done` lands the tonic triad (a resolution); `stop` decays the run out over `envelope.release` without resolving (an abandoned load). Milestones at the quarters tick, the half stronger. It reads the same key, timbre, and material as everything else, plus the `events.progress` override.

`hold` (v0.5) is the indeterminate case: still working, no ETA. The lead rocks between two neighbouring rungs and there is no reference tone, because a reference is a promise of resolution and this state makes none. A later `set` converts the hold into a determinate run (the reference fades in with it); `done` and `stop` end it as usual. Use it for spinners, syncing, and a voice interface's thinking state.

## Offline render (v0.3)

`Anti.render(event, { value, duration, sampleRate })` renders any one-shot grammar event under the current theme into an OfflineAudioContext and resolves with a mono AudioBuffer (defaults: 2.5 s, 48 kHz). Event overrides apply. The studio's WAV pack export runs on this; no user gesture or running live context is required. (The stateful tiers, drone and progress, are live-only; render covers the one-shot grammar and notifications.)

## Listener etiquette (v0.4)

Sound that ships on by default has to be leaveable, so the listener gets controls separate from the theme (which is the designer's).

- `Anti.setEnabled(bool)` / `Anti.enabled`: the off switch. Disabling releases any held drone/progress voices gracefully, then silences the engine (`play` no-ops). Persisted to `localStorage` (`anti.enabled`), so a muted visitor stays muted next visit.
- `Anti.setVolume(0..1)` / `Anti.volume`: the listener's own volume, a final gain distinct from `gain.master` (the theme's level). Persisted (`anti.volume`). Offline render ignores it, so exported packs are unaffected.

## Loudness safety (v0.4)

The bus ends in a brickwall limiter (fast attack, near-0 ceiling) after the glue compressor, so no theme and no stack of simultaneous events can ever spike past the ceiling. Combined with the bounded per-voice gains and the voice cap, "nothing may ever spike loud" is now enforced, not just intended.

## Planned

- **JSON Schema** file for validation. The format is feature-complete; `anti-tapes/schema` already describes it as data, and a JSON Schema derived from that may follow.
