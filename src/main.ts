/**
 * Bootstrap. The page is fully rendered by HTML + CSS, including the intro,
 * so the motion/interaction bundle loads only once the intro has played
 * (1.2 s after the load event) or as soon as the visitor interacts, whichever
 * comes first. Parsing it never competes with first paint, LCP or the intro
 * frames on slow phones.
 */
let started = false;
const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

function start() {
  if (started) return;
  started = true;
  EVENTS.forEach((e) => removeEventListener(e, start));
  void import('./app');
}

EVENTS.forEach((e) => addEventListener(e, start, { once: true, passive: true }));
const afterLoad = () => setTimeout(start, 1200);
if (document.readyState === 'complete') afterLoad();
else addEventListener('load', afterLoad, { once: true });
