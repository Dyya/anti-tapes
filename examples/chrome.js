/*
  Page furniture for the examples: the bar's two listener choices (sound on or
  off, day or night), the footer, and a toast stack. None of it is the lesson. It lives here
  so each example file is only the interaction it is about, and so the off
  switch is on every page of this gallery without being retyped four times.

  The off switch is not decoration. A surface that makes sound and offers no way
  to stop it is the reason products ship silent, so the engine ships
  Anti.setEnabled and every surface in this project carries it.
*/
import Anti from 'anti-tapes';

const el = (id) => document.getElementById(id);

/*
  The seven glyphs these pages use, inlined.

  They used to come from Anti's internal icon sprite, which carries fifty-odd
  glyphs and is proprietary. Seven copied here is better than a private
  dependency on a public page, and better than a second sprite file nobody
  would think to look in. They are the same paths, at the same stroke weight,
  so the gallery still draws the marks the rest of the brand draws.
*/
const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"';

const SPRITE = `
<symbol id="at-mark" viewBox="-2 -2 20 20">
  <rect x="4" y="6.75" width="8" height="2.5" fill="currentColor"/>
  <circle cx="8" cy="0" r="2" fill="currentColor"/>
  <circle cx="0" cy="16" r="2" fill="currentColor"/>
  <circle cx="16" cy="16" r="2" fill="currentColor"/>
</symbol>
<symbol id="at-sound" viewBox="0 0 24 24">
  <g ${STROKE}><path d="M13 1V23H11L5 17H1.9167C1.4104 17 1 16.5896 1 16.0833V7.9167C1 7.4104 1.4104 7 1.9167 7H5L11 1H13Z"/><path d="M17 8.5C18.4 9.6 19.2 10.8 19.2 12C19.2 13.2 18.4 14.4 17 15.5"/><path d="M20 5.5C22.2 7.3 23.4 9.6 23.4 12C23.4 14.4 22.2 16.7 20 18.5"/></g>
</symbol>
<symbol id="at-sound-mute" viewBox="0 0 24 24">
  <g ${STROKE}><path d="M17.5 12H23M13 1V23H11L5 17H1.9167C1.4104 17 1 16.5896 1 16.0833V7.9167C1 7.4104 1.4104 7 1.9167 7H5L11 1H13Z"/></g>
</symbol>
<symbol id="at-commit" viewBox="0 0 24 24">
  <g ${STROKE}><path d="M0 10.9286L8.7273 19.5L24 4.5"/></g>
</symbol>
<symbol id="at-reject" viewBox="0 0 24 24">
  <g ${STROKE}><path d="M1 23H23V1H1V23ZM23 1L1 23"/></g>
</symbol>
<symbol id="at-grab" viewBox="0 0 24 24">
  <g ${STROKE}><circle cx="7.5" cy="7.5" r="0.5"/><circle cx="7.5" cy="16.5" r="0.5"/><circle cx="16.5" cy="7.5" r="0.5"/><circle cx="16.5" cy="16.5" r="0.5"/></g>
</symbol>
<symbol id="at-change" viewBox="0 0 24 24">
  <g ${STROKE}><path d="M23 12V1H1V23H23V12ZM1 23L12 12H23"/></g>
</symbol>`;

/*
  The footer, which is the home page's: the same destinations in the same
  order, so a reader who came here from the site can leave the same way. It is
  built here and not written into five pages, because a row of links copied
  five times is five rows to keep true. An entry with no address is a place
  that is not open yet; it is drawn and refuses, as it does on the home page.
*/
const SITE = 'https://anti.fyi';
// One row, as on the home page. The entries marked wide leave on a phone,
// where the four that stay are spread evenly across the width.
const FOOTER = [
  ['GitHub', 'https://github.com/Dyya/anti-tapes', 'wide'],
  ['Register', '', 'wide'],
  ['Contact', 'mailto:hello@anti.fyi'],
  ['Privacy', SITE + '/privacy'],
  ['Terms', SITE + '/terms'],
  ['Changelog', SITE + '/changelog', 'wide'],
  ['Made by AD&', 'https://adidot.com/']
];

function mountFooter() {
  const foot = document.querySelector('footer.foot');
  if (!foot || foot.querySelector('.links')) return;
  const nav = document.createElement('nav');
  nav.className = 'links';
  nav.setAttribute('aria-label', 'Anti Tapes');
  for (const [label, href, wide] of FOOTER) {
    const a = document.createElement('a');
    a.textContent = label;
    if (wide) a.className = 'wide';
    if (href) a.href = href;
    else { a.setAttribute('aria-disabled', 'true'); a.setAttribute('tabindex', '0'); }
    nav.appendChild(a);
  }
  // The mark the home page keeps in its bottom right corner, at the other
  // end of the same line.
  const copy = document.createElement('span');
  copy.className = 'copy';
  copy.textContent = 'A\\T\u00A92016-26';
  const row = document.createElement('div');
  row.className = 'foot-row';
  row.appendChild(nav);
  row.appendChild(copy);
  foot.appendChild(row);
}

/*
  A reader who has already clicked on another page of this site, in this tab,
  is not asked to click again where the browser lets sound start: a
  same-site navigation carries the click with it (Chromium does), and the
  page can see that at load. Where it does not (Safari, Firefox, a first
  visit, a pasted address) nothing is created, and the first gesture arms
  the engine as before. The probe is the point: calling Anti.resume() on a
  context the browser will not start would leave the engine waiting on a
  promise that never settles, reporting ready while every sound queues.
*/
function carriedOver() {
  const ua = navigator.userActivation;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!ua || !ua.hasBeenActive || !AC) return false;
  try {
    const probe = new AC();
    const ok = probe.state === 'running';
    probe.close();
    return ok;
  } catch (e) { return false; }
}

function mountSprite() {
  if (document.getElementById('at-sprite')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'at-sprite');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  svg.innerHTML = SPRITE;
  document.body.prepend(svg);
}

/** Wire the bar. Call once, after the DOM is parsed. */
export function mountChrome() {
  mountSprite();
  mountFooter();
  const flip = el('soundflip');
  const ico = el('soundflip-ico');
  if (flip && ico) {
    const sync = () => {
      const on = Anti.enabled;
      flip.setAttribute('aria-pressed', String(on));
      ico.querySelector('use').setAttribute('href', on ? '#at-sound' : '#at-sound-mute');
      ico.classList.remove('at-punch');
      void ico.offsetWidth;
      ico.classList.add('at-punch');
    };
    sync();
    flip.addEventListener('click', () => {
      const next = !Anti.enabled;
      Anti.setEnabled(next);
      sync();
      // Turning sound on says so out loud. Turning it off says nothing, which
      // is the only honest acknowledgement it can give.
      if (next) Anti.play('commit');
    });
  }

  const night = el('themeflip');
  if (night) {
    night.addEventListener('click', () => {
      const on = night.getAttribute('aria-pressed') !== 'true';
      night.setAttribute('aria-pressed', String(on));
      document.body.setAttribute('data-at-theme', on ? 'night' : 'day');
      Anti.play(on ? 'commit' : 'release');
    });
  }

  // The arm hint retires itself once the context is live, because a hint that
  // outlasts the thing it hints at is just furniture.
  const hint = el('hint');
  if (hint) {
    // Armed on another page of the site: arm here too, and ask nothing.
    if (Anti.enabled && carriedOver()) Anti.resume();
    // The line stands only while a click would do what it says: sound is on
    // and the engine is not yet live.
    const arm = () => {
      if (Anti.enabled && !Anti.ready) return;
      hint.classList.add('gone');
      window.removeEventListener('pointerdown', arm, true);
      window.removeEventListener('keydown', arm, true);
    };
    window.addEventListener('pointerdown', arm, true);
    window.addEventListener('keydown', arm, true);
    arm();
  }

  // The page loaded and its module graph resolved, which is what the build
  // banner is watching for.
  window.__antiExample = true;
  const banner = el('nobuild');
  if (banner) banner.hidden = true;
}

/**
 * Raise a toast on the notification tier. The sound and the sight are one
 * event: the tier names both, so they cannot drift apart.
 */
export function toast(tier, message) {
  const stack = el('toasts');
  if (!stack) return;
  // The same tier-to-glyph map the studio and the specimen use: at-reject
  // meaning warning here while meaning error there was exactly the drift the
  // no-drift rule for this file exists to refuse. at-grab and at-change came
  // over from the sprite with it, and the two glyphs the old map alone used
  // (at-close, at-circle-s) left with it.
  const ICON = { success: 'at-commit', info: 'at-grab', warning: 'at-change', error: 'at-reject' };
  const node = document.createElement('div');
  node.className = 'at-toast at-toast--' + tier;
  node.innerHTML =
    '<span class="at-dot' + (tier === 'info' ? ' at-dot--ring' : '') + '" aria-hidden="true"></span>' +
    '<svg class="at-icon at-icon--s" aria-hidden="true"><use href="#' + ICON[tier] + '"></use></svg>' +
    '<span class="msg"></span>' +
    '<time>' + new Date().toTimeString().slice(0, 5) + '</time>';
  node.querySelector('.msg').textContent = message;
  stack.prepend(node);
  Anti.play(tier);
  setTimeout(() => {
    node.classList.add('at-toast--leaving');
    setTimeout(() => node.remove(), 300);
  }, 2600);
}
