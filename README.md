# Anti Studio

Custom interaction sound design for digital interfaces.

Anti Tapes Studio is a dependency-free Web Audio engine for designing responsive sound for software, web, and mobile interfaces.
It shapes sound in real time around user interaction and context, turning interface behavior into a coherent sound language controlled by a single theme.
Every sound is synthesized live. Nothing is fetched or sampled. The same interaction remains recognizable without producing the exact same waveform twice, and a single JSON object can retune the entire sound system.

Built from a decade of interaction sound practice at Anti Tapes (est. 2016, [anti.fyi](https://anti.fyi)).

## Install

The engine is one file with no dependencies. Copy [`engine/anti.js`](engine/anti.js) into your project and load it:

```html
<script src="anti.js"></script>
<script>
  Anti.bind();
</script>
```

With a bundler, install from this repository. The package builds itself on install (ESM, CommonJS and types):

```sh
npm i github:Dyya/anti-tapes
```

## Quick start

```js
import Anti from 'anti-tapes';   // with a script tag, Anti is already a global

Anti.bind();                 // every [data-anti] element, wired
Anti.play('commit');         // a resolving triad, built from the theme's scale
Anti.setTheme({ key: { root: 'D' }, timbre: { brightness: 1800 } });
```

```html
<button data-anti="commit">Save</button>
<button data-anti="reject">Cancel</button>
```

That is the whole integration. The AudioContext starts on the first user gesture. Before that every call is a silent no-op, so importing on a server or calling during a render is safe.

## The grammar

Eleven events. The meaning is fixed; the theme sets the sound.

| Event | What it says |
|---|---|
| `grab` | contact: a short soft pluck at the value's pitch |
| `tick` | position: focus moves, detents, insertion points. Felt more than heard; the most-fired sound in an interface |
| `undo` | the take-back: tick played backwards, so a deletion reads as the insertion reversed |
| `commit` | it resolved: a staggered triad from the theme's scale, so minor themes commit minor |
| `reject` | it did not: a beating minor second, quiet and brief |
| `release` | letting go |
| `success` `info` `warning` `error` | the notification tier. Success ascends and resolves, info is a calm ping, warning ends unresolved, error lands in a beating cluster |
| `signature` | the brand moment: a two-second motif generated deterministically from the theme and its seed. Launch or sign-in, never ambient |

[docs/grammar.md](docs/grammar.md) records which event each interaction gets, how much weight it carries, and when to stay silent (a tooltip is silent; a modal opens lower on the ladder than a popover).

Continuous change is a held drone, not an event: one gesture, one sound. Each drone is named, so several can run at once:

```js
Anti.drone.start('volume', 0.5);      // the onset IS the grab, no pluck on top
Anti.drone.move('volume', 0.8, 0.9);  // glides. Third arg is intensity
Anti.drone.stop('volume');            // the decay IS the release
```

Loading is a run that resolves when it lands:

```js
Anti.progress.start('upload', 0);
Anti.progress.set('upload', 0.4);
Anti.progress.hold('upload');   // indeterminate: no reference tone, because a
                                // reference is a promise of resolution
Anti.progress.done('upload');   // resolves. stop() abandons without resolving
```

`Anti.silence()` stops every held drone and progress run at once, for a view left mid-gesture.

## Theming

One object retunes everything. Every field is optional and merges over the default.

```js
Anti.setTheme({
  name: 'Tape',
  key: { root: 'F', scale: 'minorPentatonic', octaves: [3, 5] },
  timbre: { neutral: 'noise', charged: 'sawtooth', brightness: 1600, articulation: 'none' },
  material: { type: 'paper', amount: 0.4 },
  envelope: { firmness: 0.3, release: 0.5 },
  etiquette: { repetition: 0.6 },
  signature: { seed: 7 }
});
```

Ten materials (glass, wood, rubber, metal, ceramic, plastic, felt, membrane, stone, paper): modal resonator banks under the contact events. Eight scales, including the modes and whole-tone. Any timbre slot may be `noise`: bandpassed white noise centered on the note, so pitch still carries the value.

Presets ship with the package:

```js
import tape from 'anti-tapes/themes/tape.theme.json' with { type: 'json' };
Anti.setTheme(tape, { replace: true });
```

Node and current browsers require the import attribute for a JSON module; a bundler that inlines JSON accepts it.

The format is documented in [docs/theme.md](docs/theme.md). `anti-tapes/schema` describes it as data (one row per tunable modifier field, with kind, range and options), so an editor can be generated from it. The signature seed and per-event overrides have no schema row.

A theme written by hand plays exactly like one made in a tool. The grammar is a specification; this engine is its reference implementation, MIT licensed so other tools and runtimes can implement the format.

## Etiquette

The engine enforces manners rather than trusting them:

- **Silence is the default.** Sound speaks only when the user acts.
- **A real off switch.** `Anti.setEnabled(false)` and `Anti.setVolume(0.5)`, both persisted. The listener's setting is never the theme's.
- **Nothing spikes.** Every voice is enveloped, voices are capped at 16 and self-cleaning, and the bus ends in a compressor and a hard-clip ceiling.
- **Repetition thins itself.** Fast repeats of the same event get quieter and recover over about a second of quiet.

## API

```
Anti.play(event, opts?)             Anti.setTheme(theme, { replace? })
Anti.bind(root?)                    Anti.getTheme()
Anti.drone.start/move/stop(id, ..)  Anti.setEnabled(on) / Anti.enabled
Anti.progress.start/set/hold/       Anti.setVolume(v) / Anti.volume
     done/stop(id, ..)              Anti.render(event, opts?) -> Promise<AudioBuffer>
Anti.silence()                      Anti.resume() / Anti.ready
                                    Anti.events / materials / scales / version
```

`Anti.render` renders an event through an OfflineAudioContext, for sound packs. `Anti.resume()` starts the context from the host's own gesture instead of the engine's listeners. `Anti.ready` says whether a call will sound right now. TypeScript declarations are included.

## Examples

Four pages, each mapping one interaction family onto the grammar.

| Page | What it works out |
|---|---|
| `examples/vanilla.html` | Attribute binding, a mechanism's grab and verdict, the drone gesture, a progress run, the notification tier |
| `examples/keys.html` | Typing on the letter ladder, and backspace as the one reversed envelope in the grammar |
| `examples/form.html` | Focus as position, validation as a verdict that waits for blur, a save as a run, and the four places that stay silent |
| `examples/react.html` | Two hooks and the bug they prevent: a component that unmounts mid-drag, and a view change that would leave a voice held |

They import the package by its bare name, as an app does, so they need a server:

```sh
./serve.sh      # builds the package, serves the repo
```

then open `/examples/`.

## Anti Studio

[Anti Studio](https://anti.fyi) is the instrument for designing a theme by ear: real controls across six interaction scenarios plus a density stress section, all on one theme, exported as theme JSON, an integration snippet, or a rendered sound pack.

The studio is free to play and is not part of this repository. The engine is free and unrestricted, and always will be.

## License

MIT. See [LICENSE](LICENSE). The Anti and Anti Tapes names and logos are trademarks and are not licensed by it.
