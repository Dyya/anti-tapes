/*
  The Anti theme format, described as data.

  The engine renders a theme; this file says what a theme HAS. It exists so
  that the things which enumerate the format (the studio's theme panel, the
  exported pack, the audio-branding spec sheet to come) can be generated from
  one declaration instead of each keeping a hand-written copy in step.

  The cost it removes is real: before this, adding one modifier to the engine
  meant hand-editing the panel markup, the read-back, the wiring, and the
  option list, in that order, and any editor built later would have started a
  fifth copy. Now a modifier is one row below.

  Optional and standalone: the engine neither loads nor needs this. Zero build,
  file:// friendly, no dependencies. Sets window.AntiSchema.

  Option lists that the engine owns (materials, scales) are named rather than
  copied, so a new material appears in every editor without an edit here.

  Wrapped the same way the engine is (see anti.js): a script tag, a require,
  or, with the marked halves swapped, the package's anti-tapes/schema entry.
*/
/* @anti:head */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.AntiSchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
/* @anti:body */
  'use strict';

  // A named list is resolved against the engine at read time: 'materials'
  // means Anti.materials. An inline array is taken as written.
  var OPTIONS = {
    roots: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    waves: ['sine', 'triangle', 'square', 'sawtooth', 'noise'],
    articulations: ['none', 'chirp'],
    materials: 'engine',
    scales: 'engine'
  };

  // Only the few option values whose raw name reads badly in a control. The
  // rest are sentence-cased by label() below, so an editor never has to decide
  // the casing itself and two editors cannot disagree about it.
  var LABELS = {
    majorPentatonic: 'Major pent.',
    minorPentatonic: 'Minor pent.',
    wholeTone: 'Whole tone'
  };

  // The panel, in order. `path` is the dotted location in the theme object;
  // `kind` picks the control; `group` says which band of the panel it belongs
  // to. A fader's min/max/step are the editing range, not the engine's clamp:
  // the engine sanitizes on ingest regardless.
  //
  // The groups are what a horizontal layout needs and a vertical one can
  // ignore: stacked in a column the rows already read in order, but laid out
  // as a dock they have to break into named columns, the way an instrument
  // breaks its front panel into sections. Declaring the band here rather than
  // in the studio keeps the format describing itself: a new modifier still
  // costs one row, and it lands in the right section of every editor.
  // Bands run to three rows at most, which is what a strip laid along the foot
  // of a screen can show without scrolling down. With that limit the bands fell
  // out along the theme object's own sections, which is the right seam anyway:
  // the three timbre voices, the rest of timbre, material, envelope, gains.
  //
  // A row carries ONE control, or two when they are halves of a single value
  // (key and scale name one key; the octave pair names one span). Three across
  // makes each a third of a column, too narrow to read a word like 'sawtooth'
  // in, and forces a caption underneath to say which is which, which is a label
  // the row should have carried in the first place.
  var ROWS = [
    { kind: 'text', label: 'Name', path: 'name', group: 'Identity' },

    { kind: 'menu', label: 'Key', paths: ['key.root', 'key.scale'], options: ['roots', 'scales'], group: 'Identity' },

    { kind: 'octaves', label: 'Octaves', path: 'key.octaves', min: 1, max: 8, group: 'Identity' },

    // The three waveform slots are three values, so they are three rows. As one
    // row of three menus they were a control per third of a column: too narrow
    // to read a word like 'sawtooth' in, and needing a caption underneath to
    // say which was which, which is a label the row should have carried itself.
    { kind: 'menu', label: 'Neutral', paths: ['timbre.neutral'], options: ['waves'], group: 'Waveforms' },
    { kind: 'menu', label: 'Secondary', paths: ['timbre.secondary'], options: ['waves'], group: 'Waveforms' },
    { kind: 'menu', label: 'Charged', paths: ['timbre.charged'], options: ['waves'], group: 'Waveforms' },

    {
      kind: 'menu', label: 'Articulation',
      paths: ['timbre.articulation'], options: ['articulations'], fallback: 'none',
      caption: 'Chirp glides each one-shot down an octave into its note',
      group: 'Timbre'
    },
    { kind: 'fader', label: 'Brightness', path: 'timbre.brightness', min: 800, max: 6000, step: 50, format: 'int', group: 'Timbre' },

    { kind: 'menu', label: 'Material', paths: ['material.type'], options: ['materials'], group: 'Material' },
    { kind: 'fader', label: 'Material amount', path: 'material.amount', min: 0, max: 1, step: 0.01, format: 'f2', group: 'Material' },

    { kind: 'fader', label: 'Firmness', path: 'envelope.firmness', min: 0, max: 1, step: 0.01, format: 'f2', group: 'Envelope' },
    { kind: 'fader', label: 'Release', path: 'envelope.release', min: 0.1, max: 1.2, step: 0.01, format: 'sec', group: 'Envelope' },

    { kind: 'fader', label: 'Repetition governor', path: 'etiquette.repetition', min: 0, max: 1, step: 0.01, format: 'f2', group: 'Levels' },
    { kind: 'fader', label: 'Voice gain', path: 'gain.voice', min: 0.05, max: 0.16, step: 0.005, format: 'f2', group: 'Levels' },
    { kind: 'fader', label: 'Master', path: 'gain.master', min: 0.3, max: 1, step: 0.01, format: 'f2', group: 'Levels' }
  ];

  var FORMATS = {
    int: function (v) { return String(Math.round(v)); },
    f2: function (v) { return v.toFixed(2); },
    sec: function (v) { return v.toFixed(2) + 's'; }
  };

  // Read a dotted path out of a theme.
  function get(theme, path) {
    var keys = path.split('.');
    var cur = theme;
    for (var i = 0; i < keys.length; i++) {
      if (cur == null) return undefined;
      cur = cur[keys[i]];
    }
    return cur;
  }

  // Build the smallest partial theme that sets one dotted path, ready for
  // Anti.setTheme (which merges).
  function partial(path, value) {
    var keys = path.split('.');
    var out = {};
    var cur = out;
    for (var i = 0; i < keys.length - 1; i++) {
      cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
    return out;
  }

  // Where the engine-owned lists are read from. A script tag leaves an Anti on
  // the global and this finds it by itself, which is every surface in this
  // repo. An imported module has no such global to look at, so a package
  // consumer hands the engine in once: AntiSchema.use(Anti). Without either,
  // the named lists come back empty rather than throwing.
  var engine = null;

  function use(api) {
    engine = api || null;
    return engine;
  }

  function resolveEngine() {
    if (engine) return engine;
    var g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : null;
    return (g && g.Anti) || null;
  }

  // Resolve an option list by name. Engine-owned lists are read live so the
  // editor never lags the engine; an unknown name yields an empty list rather
  // than throwing, so a stale schema degrades to a dead control, not a dead page.
  function options(name) {
    var v = OPTIONS[name];
    if (Array.isArray(v)) return v.slice();
    var api = resolveEngine();
    if (v === 'engine' && api && Array.isArray(api[name])) return api[name].slice();
    return [];
  }

  // House rule: UI text is sentence case. The theme's option values are code
  // ('sine', 'glass', 'minorPentatonic'), so the casing is put on here, once,
  // rather than left to each editor to decide and drift apart on. Note keys
  // ('C', 'F#') are already correct and single letters survive the pass.
  function label(value) {
    if (LABELS[value]) return LABELS[value];
    if (typeof value !== 'string' || !value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function format(kind, value) {
    var fn = FORMATS[kind];
    return fn ? fn(value) : String(value);
  }

  return {
    version: 1,
    rows: ROWS,
    use: use,
    options: options,
    label: label,
    format: format,
    get: get,
    partial: partial
  };
/* @anti:tail */
});
