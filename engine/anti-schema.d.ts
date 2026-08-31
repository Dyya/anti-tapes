// Type definitions for the Anti theme schema: the theme format described as
// data, so an editor can be generated from one declaration instead of kept in
// step by hand. Optional; the engine neither loads nor needs it.
// https://anti.fyi

/** The control a row asks for. */
type AntiSchemaKind = 'text' | 'menu' | 'octaves' | 'fader';

/** One field of the theme format. A row carries one control, or two when they
 *  are halves of a single value (key and scale name one key). */
interface AntiSchemaRow {
  kind: AntiSchemaKind;
  /** Sentence-case label for the row. */
  label: string;
  /** Dotted location in the theme object, for single-value rows. */
  path?: string;
  /** Dotted locations, for rows whose control kind takes more than one. */
  paths?: string[];
  /** Option list names, resolved through `options()`, positional against `paths`. */
  options?: string[];
  /** Value to read when the path is absent from the theme. */
  fallback?: string | number;
  /** Editing range for a fader. Not the engine's clamp: ingest sanitizes regardless. */
  min?: number;
  max?: number;
  step?: number;
  /** Formatter name for the read-back value. */
  format?: 'int' | 'f2' | 'sec';
  /** Which band of the panel the row belongs to. */
  group?: string;
  /** One line under the control, where the field needs a sentence. */
  caption?: string;
}

interface AntiSchemaApi {
  /** Schema format version, bumped when the row shape changes. */
  readonly version: number;

  /** The panel, in order. */
  readonly rows: AntiSchemaRow[];

  /** Hand the engine in, so the lists it owns (materials, scales) resolve.
   *  Only needed when importing as a module: a script tag leaves a global
   *  this finds by itself. */
  use(engine: unknown): unknown;

  /** Resolve an option list by name. Unknown names yield an empty list. */
  options(name: string): string[];

  /** Sentence-case one option value for display. */
  label(value: string): string;

  /** Format a value for read-back next to its control. */
  format(kind: string, value: number): string;

  /** Read a dotted path out of a theme. */
  get(theme: object, path: string): unknown;

  /** Build the smallest partial theme that sets one dotted path, ready for setTheme. */
  partial(path: string, value: unknown): object;
}

declare const AntiSchema: AntiSchemaApi;

interface Window {
  AntiSchema: AntiSchemaApi;
}
