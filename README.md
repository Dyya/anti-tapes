# Anti

Interaction sound as a system, not a pile of clicks.

Anti is a tiny, dependency-free Web Audio engine that gives an interface a coherent voice. It renders a fixed event grammar (grab, tick, undo, commit, reject, release, a progress tier for loading, the notifications success / info / warning / error, and a deterministic signature) live from a single theme object. Nothing is fetched and nothing is sampled: every sound is synthesized on the spot, so the same meaning always reads the same while the exact waveform never repeats, and one JSON retunes your entire product.

Built on a decade of Anti Tapes (est. 2016, [anti.fyi](https://anti.fyi)) interaction sound practice.

```sh
npm i anti-tapes
```

## Quick start

```js
import Anti from 'anti-tapes';

Anti.bind();                 // every [data-anti] element, wired
Anti.play('commit');         // a resolving triad, built from the theme's scale
Anti.setTheme({ key: { root: 'D' }, timbre: { brightness: 1800 } });
```

```html
<button data-anti="commit">Save</button>
<button data-anti="reject">Cancel</button>
```

That is the whole integration. The AudioContext is created and resumed on the first user gesture, and before that every call quietly does nothing, so importing this on a server or calling it during a render is safe and silent.

No build step required either. The package ships a global build for a script tag:

```html
<script src="https://unpkg.com/anti-tapes"></script>
<script>
  Anti.bind();
</script>
```

## The grammar

Eleven events form the grammar. Their meaning is fixed; the theme determines how they sound.

| Event | What it says |
|---|---|
| `grab` | contact: a short soft pluck at the value's pitch |
| `tick` | the positional micro event: focus moves, detents, insertion points. Felt more than heard, and the most-fired sound in a real interface |
| `undo` | the take-back: tick played backwards, so a deletion reads as the insertion reversed |
| `commit` | it resolved: a staggered triad from the theme's scale, so minor themes commit minor |
| `reject` | it did not: a beating minor second, quiet and brief |
| `release` | letting go |
| `success` `info` `warning` `error` | the notification tier. Success ascends and resolves, info is a calm ping, warning ends unresolved, error lands in a beating cluster |
| `signature` | the brand moment: a two-second motif generated deterministically from the theme and its seed. Launch or sign-in, never ambient |

Which event belongs to a moment, how much weight it carries, and when to stay silent are recorded in [docs/grammar.md](docs/grammar.md): why a tooltip is silent, why a modal opens lower on the ladder than a popover, why a drag ends with `drone.stop` alone, and why a keyboard has no travel.

Continuous change is a held drone rather than an event, because a drag is one gesture and should be one sound. You name the run, so any number of them can be in the air at once:

```js
Anti.drone.start('volume', 0.5);      // the onset IS the grab, no pluck on top
Anti.drone.move('volume', 0.8, 0.9);  // glides. Third arg is intensity
Anti.drone.stop('volume');            // the decay IS the release
```

Loading is a run that resolves exactly when it lands:

```js
Anti.progress.start('upload', 0);
Anti.progress.set('upload', 0.4);
Anti.progress.hold('upload');   // indeterminate: no reference tone, because a
                                // reference is a promise of resolution
Anti.progress.done('upload');   // resolves. stop() abandons without resolving
```

`Anti.silence()` stops every held drone and progress run at once, which is what a view being left mid-gesture needs.

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

Ten materials (glass, wood, rubber, metal, ceramic, plastic, felt, membrane, stone, paper) are modal resonator banks layered under the contact events. Eight scales, including the modes and whole-tone. Any timbre slot may be `noise`, which voices as bandpassed white noise centered on the note, so pitch still carries the value.

Presets ship with the package:

```js
import tape from 'anti-tapes/themes/tape.theme.json' with { type: 'json' };
Anti.setTheme(tape, { replace: true });
```

(The import attribute is what Node and current browsers require for a JSON module; a bundler that inlines JSON does not mind it.)

The format is documented in [docs/theme.md](docs/theme.md), and described as data in `anti-tapes/schema`: one row per tunable modifier field with its kind, range and options, so an editor can be generated from the format rather than hand-written against it. The signature seed and the per-event overrides are documented in the theme format but carry no schema row.

A theme is a text file, and one written by hand plays exactly like one made in a tool. The grammar is a specification and this engine is its reference implementation, MIT licensed so other tools and runtimes can implement the format too.

## Etiquette, which is why this can be left on

The reason products ship silent is that sound is usually rude. This engine enforces manners rather than trusting them:

- **Silence is the default state.** Sound only speaks when the user acts.
- **A real off switch.** `Anti.setEnabled(false)` and `Anti.setVolume(0.5)`, both persisted. The listener's setting is never the theme's.
- **Nothing spikes.** Every voice is enveloped, the bus ends in a compressor and a hard-clip ceiling, and voices are capped at 16 and self-cleaning.
- **Repetition thins itself.** Fast repeats of the same event get quieter and recover over about a second of quiet, so a held key does not become a jackhammer.

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

`Anti.render` runs an event through an OfflineAudioContext, which is how sound packs are rendered offline. `Anti.resume()` is the explicit arm for a host that wants to start the context on its own gesture rather than the engine's listeners, and `Anti.ready` says whether a call will sound right now. TypeScript declarations are included.

## Examples

Four pages, each mapping one interaction family onto the grammar and saying which calls were judgment rather than mechanics.

| Page | What it works out |
|---|---|
| `examples/vanilla.html` | Attribute binding, a mechanism's grab and verdict, the drone gesture, a progress run, the notification tier |
| `examples/keys.html` | Typing on the letter ladder, and backspace as the one reversed envelope in the grammar |
| `examples/form.html` | Focus as position, validation as a verdict that waits for blur, a save as a run, and the four places that stay silent |
| `examples/react.html` | Two hooks and the bug they prevent: a component that unmounts mid-drag, and a view change that would leave a voice held |

They import the package over a bare specifier the way an app does, so they need a server rather than a file path:

```sh
./serve.sh      # builds the package, serves the repo
```

then open `/examples/`.

## Anti Studio

Designing a sound identity by typing numbers into JSON is a poor way to use your ears. [Anti Studio](https://anti.fyi) is the instrument: a rack of real controls across six interaction scenarios plus a density stress section, all on one theme, tuned by direct manipulation and by ear, then exported as theme JSON, an integration snippet, or a rendered sound pack.

The studio is free to play and is not part of this repository. This engine is, and always will be, free and unrestricted.

## License

MIT. See [LICENSE](LICENSE). The Anti and Anti Tapes names and logos are trademarks and are not licensed by it.
