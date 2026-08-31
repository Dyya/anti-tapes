/*
  Build the npm package. Node, no dependencies, no bundler.

  The engine is one hand-written file that already runs as a script tag and as
  a CommonJS require (see the wrapper in engine/anti.js). What it cannot be
  without help is an ES module, because a file cannot declare `export` and
  still be legal inside a `<script>`. So this swaps the wrapper: the body
  between the /* @anti:body *\/ and /* @anti:tail *\/ markers is lifted out
  untouched and given a different footer per target.

  That is the whole build. It parses nothing, minifies nothing, and rewrites no
  code, which is deliberate: the file people read in this repo and the file npm
  installs are the same engine, character for character, and a diff between
  them is a diff of footers. The moment this file starts transforming the body
  is the moment the promise stops being checkable.

  dist/ is generated and not committed. `npm run build` makes it; publishing
  runs it first (prepublishOnly), so what ships cannot lag the source.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const HEAD = '/* @anti:head */';
const BODY = '/* @anti:body */';
const TAIL = '/* @anti:tail */';

function fail(msg) {
  console.error('build-package: ' + msg);
  process.exit(1);
}

// Split one wrapped source into its leading doc comment and its body. The doc
// comment rides along to every output (it is the file's license and history);
// the wrapper explanation between it and the head marker does not, because in
// a built file there is no wrapper left to explain.
function split(file) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const marker of [HEAD, BODY, TAIL]) {
    if (src.indexOf(marker) === -1) fail(file + ' has no ' + marker + ' marker. The wrapper was edited; fix it or fix this script.');
  }
  const docEnd = src.indexOf('*/');
  if (docEnd === -1 || docEnd > src.indexOf(HEAD)) fail(file + ' does not open with a doc comment.');
  return {
    src: src,
    doc: src.slice(0, docEnd + 2),
    body: src.slice(src.indexOf(BODY) + BODY.length, src.indexOf(TAIL))
  };
}

function write(name, text) {
  fs.writeFileSync(path.join(DIST, name), text);
  console.log('  dist/' + name + '  ' + (text.length / 1024).toFixed(1) + ' kB');
}

function build(file, globalName, base) {
  const part = split(file);
  const iife = 'const ' + globalName + ' = (function () {' + part.body + '})();\n';

  // The global build is the source verbatim: script tag, CDN, file://.
  write(base + '.js', part.src);
  write(base + '.mjs', part.doc + '\n' + iife + '\nexport default ' + globalName + ';\nexport { ' + globalName + ' };\n');
  write(base + '.cjs', part.doc + '\n\'use strict\';\n' + iife + '\nmodule.exports = ' + globalName + ';\nmodule.exports.' + globalName + ' = ' + globalName + ';\nmodule.exports.default = ' + globalName + ';\n');
  return part;
}

// The type declarations are hand-written for the global (script tag) case:
// `declare const Anti` plus a Window augmentation. A module entry needs the
// opposite shape, so the global block becomes an export list wrapped in
// `declare global`, which keeps the window typing for anyone who loads both.
//
// The same text is written three times under three extensions, which looks
// silly and is not. Under moduleResolution nodenext, a .d.ts takes its module
// format from the nearest package.json `type` field, so a single .d.ts is read
// as CommonJS, its `export default` is taken to mean `module.exports.default`,
// and `import Anti from 'anti-tapes'` in an ESM file silently resolves to the
// namespace instead: every method then reports as missing on a type that is
// otherwise correct. The extension is what tells TypeScript which format it is
// reading, so each entry gets the declaration file that matches it.
function buildTypes(file, base, globalName, exports) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const cut = src.indexOf('declare const ' + globalName);
  if (cut === -1) fail(file + ' has no `declare const ' + globalName + '`.');
  const footer =
    'declare const ' + globalName + ': ' + globalName + 'Api;\n\n' +
    'declare global {\n  interface Window {\n    ' + globalName + ': ' + globalName + 'Api;\n  }\n}\n\n' +
    'export default ' + globalName + ';\n' +
    'export { ' + globalName + ' };\n' +
    'export type {\n' + exports.map(function (t) { return '  ' + t + ','; }).join('\n') + '\n};\n';
  const types = src.slice(0, cut) + footer;
  ['.d.ts', '.d.mts', '.d.cts'].forEach(function (ext) { write(base + ext, types); });
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

console.log('Building anti-tapes:');
const engine = build('engine/anti.js', 'Anti', 'anti');
build('engine/anti-schema.js', 'AntiSchema', 'anti-schema');

buildTypes('engine/anti.d.ts', 'anti', 'Anti', [
  'AntiApi', 'AntiTheme', 'AntiPartialTheme', 'AntiEvent', 'AntiWave', 'AntiScale',
  'AntiMaterial', 'AntiArticulation', 'AntiEventOverride', 'AntiDeepPartial',
  'AntiPlayOpts', 'AntiRenderOpts', 'AntiDrone', 'AntiProgress'
]);
buildTypes('engine/anti-schema.d.ts', 'anti-schema', 'AntiSchema', [
  'AntiSchemaApi', 'AntiSchemaRow', 'AntiSchemaKind'
]);

// The package version is the engine version. One number, read from the source
// of truth, so a publish cannot ship one version of the engine as another.
const version = (engine.src.match(/var VERSION = '([^']+)'/) || [])[1];
if (!version) fail('could not read VERSION from engine/anti.js.');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (pkg.version !== version) {
  fail('package.json says ' + pkg.version + ', the engine says ' + version + '. Set them to the same number.');
}

console.log('anti-tapes ' + version + ' ready in dist/');
