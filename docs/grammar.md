# The interaction sound grammar

Anti uses eleven events to give an interface a coherent sound language. The
grammar defines what each event means. A theme defines how it sounds.

This document records the decisions behind that mapping: which event belongs to a
moment, how much weight it carries, and when the interface should stay silent.
They were made one interaction family at a time, on real controls, by ear.

Each decision is implemented in [Anti Studio](https://anti.fyi), where you can
hear it in context.

## The through-line

Seven interaction families were mapped onto the grammar: buttons and choice,
drag and reorder, scroll and navigation, text and data, layers and containers,
touch gestures, and density under load.

**Not one of them needed a new event except undo.** Ten events plus a signature
covered buttons, layers, forms, voice, motion, density and gestures. What each
family actually needed was a judgment about which existing pair applies and how
heavy it should sit.

Undo is the exception that proves the shape of the rule. It came from typing:
backspace is not a forward event played quieter, it is the insertion reversed,
and nothing in the grammar could say "taken back" because every envelope in it
attacks and decays. So undo is the one voice that swells in slowly, bends down an
octave, and seats fast. If you need a new event, that is what the bar looks like.

## What stays silent, and why that is the hard part

Silence is the default state. Sound speaks when the user acts, and a surface that
sounds at every opportunity is the reason products ship muted.

- **A tooltip is silent.** The user did not act, they rested. A sound here is the
  interface talking to itself.
- **A disabled control is silent.** Nothing happened, and nothing is what silence
  is for.
- **A locked control refuses out loud.** This is not a contradiction of the line
  above: a refusal is an answer, and saying nothing to someone who pressed is
  not. Disabled means the control is not there; locked means it is there and said
  no.
- **A release outside the control is a release alone**, with no verdict after it.
  Pressing and sliding off is the interface's built-in undo, and giving it a
  verdict would report an outcome that did not occur.
- **A drag that ends unarmed makes no extra sound at all.** See below; this is
  the rule that took the longest to keep.

## Layers

- **A modal opens lower on the ladder than a popover.** Weight is pitch, not
  volume. A modal owns the interface until it is answered, and the way to say
  that is to open underneath the thing that does not.
- **A destructive confirm opens on the warning tier**, which ends unresolved on
  purpose, because an unresolved sound is what a question is. Listen to it sit
  there and refuse to finish.
- **And it confirms with a low commit.** It lands, it does not celebrate. The
  same event, moved down the ladder, is the difference between "done" and
  "done, and you should know it".

## Motion and navigation

- **A rail and a wrap must not sound alike.** Hitting the end of a list refuses,
  because nothing moved. Wrapping from last to first arrives, and ticks at the
  rung it lands on, so the pitch itself says which end you are now at.
- **A drop that is not allowed beats and snaps home.** The reject and the return
  are one event, not two.
- **Overscroll rebound is the edge beat**, once per arrival. A boundary you are
  already sitting against is not an event every frame.

## Gestures

The touch family was expected to be the biggest build and turned out to have the
least new machinery and the most argument. What it contributes is not gestures,
it is four handoffs: a gesture to a verdict, a gesture to nothing, a gesture to
the progress tier, and a gesture to a layer.

- **Pinch and rotate are one gesture, so they get one voice.** Two drones under
  one two-finger movement is the one place it is most tempting to break the
  engine's own rule. Scale owns the pitch because scale is the value; rotation
  contributes detent ticks. One drone, two axes of information.
- **Scale has ends and rotation does not**, and that is not a style choice. A
  scale limit is a rail and refuses. Rotation has no boundary at all, so the
  detent is its only positional event, and passing 360 degrees is not an event:
  nothing arrived and nothing was refused.
- **A gesture commits only when what it opens cannot speak for itself.** A long
  press on a button commits, because nothing else marks that the hold worked. A
  long press that discloses a layer does not, because the layer arriving says the
  same thing at the same instant. Two sounds in one moment read as two events.
- **A pull to refresh hands off.** The drone rises with the pull and ticks when
  the release would fire; let go armed and the drone stops and the progress tier
  takes over, because the pull was yours and the refresh is the system's. Two
  sounds, honestly, because two parties acted.

## The keyboard

The sharpest ruling in the set, and it arrived last: **a keyboard has no travel.**

There is nothing for a drone to ride and no distance at which to arm, so neither
has a keyboard equivalent, and inventing one would be sound theatre. Only the
verdict survives. Delete on a row is the same take-back the leftward swipe fires.
Enter on a pull sheet goes straight to the run, the half that was always the
system's rather than the hand's. Enter on a tile opens the layer with no grab
before it, because there is no touch to grab.

The one exception is pinch and rotate, where scale and rotation are real values a
keyboard can hold. There it stops being a drag and becomes a detented mechanism:
a tick per step, a refusal at the ends.

Put the other way round: **the drone is what the hand buys you**, and a family
whose keyboard path is identical to its pointer path was probably not using the
hand for anything.

## The rule that was hardest to keep

**A drag ends with `drone.stop` alone.**

The engine has said so since the first version, and it is still tempting to layer
a release pluck on an unarmed swipe so that "let go and nothing happened" has a
sound. It must not. Nothing happening is what silence is for, and the drone's own
decay is already the release. The one-shot grab and release pair belongs to
discrete mechanisms, a switch or a key, never to the drags.

The same rule at the other end: a drag starts with `drone.start` alone. The drone
onset **is** the grab. One gesture, one sound; two sounds read as two events.

## Etiquette is machinery, not manners

The reason interface sound has a bad name is that it is usually rude, and no
amount of taste in the individual sounds fixes a system that repeats, spikes, or
cannot be turned off. So the engine enforces this rather than trusting it:

- **A real off switch,** persisted, on every surface that sounds. And a rule
  behind it: the listener's setting is never the theme's. A master volume that
  lives in the theme is not an off switch, it is an edit to the artifact everyone
  else will hear.
- **Nothing spikes.** Every voice is enveloped, voices are capped and
  self-cleaning, and the bus ends in a compressor and a hard-clip ceiling.
- **Repetition thins itself.** Fast repeats of the same event get quieter and
  recover over about a second of quiet, so a held key does not become a
  jackhammer. Annoyance safety is enforced in the engine the way the ceiling
  enforces loudness.
- **Continuous parameters glide** with a time constant rather than jumping, so
  there is no zipper noise on a drag.

## An open format

The grammar is a specification, and the Web Audio engine in this repository is
its reference implementation. Themes are plain JSON, [documented in
full](theme.md) and published as machine-readable data (`anti-tapes/schema`, one
row per field with its kind, range and options).

A theme can be written in a text editor and played with the engine,
independently of Anti Studio. The engine is MIT licensed so that other tools and
other runtimes can implement the format.
