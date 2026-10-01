# The interaction sound grammar

Anti uses eleven events to give an interface a coherent sound language. The
grammar defines what each event means. A theme defines how it sounds.

These are the rulings behind the mapping: which event belongs to a moment, how
much weight it carries, and when to stay silent. Each was made on real controls,
by ear, one interaction family at a time. [Anti Studio](https://anti.fyi) plays
every one in context.

## The through-line

Seven interaction families were mapped onto the grammar: buttons and choice,
drag and reorder, scroll and navigation, text and data, layers and containers,
touch gestures, and density under load.

**Only one needed a new event: undo.** Ten events plus the signature covered the
rest. What each family needed was a judgment about which existing pair applies
and how heavy it sits.

Undo came from typing. Backspace is the insertion reversed, and every other
envelope in the grammar attacks and decays. So undo is the one voice that swells
in slowly, bends down an octave, and seats fast. That is the bar for a new event.

## What stays silent

Silence is the default. Sound speaks when the user acts.

- **A tooltip is silent.** The user did not act, they rested.
- **A disabled control is silent.** Nothing happened.
- **A locked control refuses out loud.** A refusal is an answer, and someone who
  pressed is owed one. Disabled means the control is not there; locked means it
  is there and said no.
- **A release outside the control is a release alone**, with no verdict.
  Sliding off is the built-in undo, and a verdict would report an outcome that
  did not occur.
- **A drag that ends unarmed makes no extra sound.** See [Drags](#drags).

## Layers

- **A modal opens lower on the ladder than a popover.** Weight is pitch, not
  volume: a modal owns the interface until it is answered.
- **A destructive confirm opens on the warning tier**, which ends unresolved,
  because a question is an unresolved sound.
- **It confirms with a low commit.** It lands without celebrating: the same
  event, lower on the ladder, says "done, and you should know it".

## Motion and navigation

- **A rail and a wrap must not sound alike.** Hitting the end of a list refuses,
  because nothing moved. Wrapping from last to first ticks at the rung it lands
  on, so the pitch says which end you are at.
- **A drop that is not allowed beats and snaps home.** The reject and the return
  are one event.
- **Overscroll rebound is the edge beat, once per arrival.** A boundary you are
  already sitting against is not an event every frame.

## Gestures

Touch added no new machinery, only four handoffs: a gesture to a verdict, to
nothing, to the progress tier, and to a layer.

- **Pinch and rotate are one gesture, so they get one voice.** Scale owns the
  pitch because scale is the value; rotation contributes detent ticks. One
  drone, two axes.
- **Scale has ends and rotation does not.** A scale limit is a rail and refuses.
  Rotation has no boundary, so the detent is its only positional event, and
  passing 360 degrees is not an event: nothing arrived and nothing was refused.
- **A gesture commits only when what it opens cannot speak for itself.** A long
  press on a button commits, because nothing else marks that the hold worked. A
  long press that discloses a layer does not: the layer arriving says the same
  thing at the same instant, and two sounds in one moment read as two events.
- **A pull to refresh hands off.** The drone rises with the pull and ticks when
  the release would fire. Let go armed and the drone stops and the progress tier
  takes over. Two sounds, because two parties acted: the pull was yours, the
  refresh is the system's.

## The keyboard

**A keyboard has no travel.** There is nothing for a drone to ride and no
distance at which to arm, so neither has a keyboard equivalent. Only the verdict
survives:

- Delete on a row fires the same take-back as the leftward swipe.
- Enter on a pull sheet goes straight to the run, the system's half.
- Enter on a tile opens the layer with no grab, because there is no touch to
  grab.

The exception is pinch and rotate, where scale and rotation are real values.
There the keyboard steps them as a detented mechanism: a tick per step, a
refusal at the ends.

**The drone is what the hand buys you.** A family whose keyboard path matches
its pointer path was probably not using the hand for anything.

## Drags

**A drag ends with `drone.stop` alone.** The drone's decay is the release. Do
not layer a release pluck on an unarmed swipe: nothing happening is what silence
is for. The one-shot grab and release pair belongs to discrete mechanisms, a
switch or a key, never to drags.

**A drag starts with `drone.start` alone.** The drone onset is the grab. One
gesture, one sound; two sounds read as two events.

## Etiquette is machinery, not manners

The engine enforces etiquette rather than trusting it:

- **A real off switch,** persisted, on every surface that sounds. The listener's
  setting is never the theme's: a master volume in the theme is an edit to what
  everyone else hears, not an off switch.
- **Nothing spikes.** Every voice is enveloped, voices are capped and
  self-cleaning, and the bus ends in a compressor and a hard-clip ceiling.
- **Repetition thins itself.** Fast repeats of the same event get quieter and
  recover over about a second of quiet.
- **Continuous parameters glide** with a time constant rather than jumping, so a
  drag has no zipper noise.

## An open format

The grammar is a specification, and the Web Audio engine in this repository is
its reference implementation. Themes are plain JSON, [documented in
full](theme.md) and published as machine-readable data (`anti-tapes/schema`, one
row per field with its kind, range and options).

A theme written in a text editor plays with the engine, independently of Anti
Studio. The engine is MIT licensed so other tools and runtimes can implement the
format.
