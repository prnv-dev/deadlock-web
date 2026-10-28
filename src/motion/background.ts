import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$ } from './env';

type Blob = [x: number, y: number, s: number]; // x in vw, y in vh, scale
interface Stop {
  sel: string;
  blobs: [Blob, Blob, Blob];
  tone: number;
}

/* One keyframe per section; the background interpolates between them. */
const STOPS: Stop[] = [
  { sel: '#top', blobs: [[0, 0, 1], [0, 0, 1], [0, 0, 1]], tone: 0 },
  { sel: '#features', blobs: [[16, 12, 1.05], [-10, 24, 0.95], [28, -8, 1.1]], tone: 0.3 },
  { sel: '#how-it-works', blobs: [[38, 30, 1], [-28, 40, 1.1], [8, 18, 0.92]], tone: 0.5 },
  { sel: '#limits', blobs: [[10, 48, 1.1], [-6, 12, 1], [42, 2, 1.05]], tone: 0.65 },
  { sel: '#faq', blobs: [[52, 44, 0.95], [-38, 30, 1.05], [2, 30, 1.1]], tone: 0.78 },
  { sel: '.cta-section', blobs: [[30, 58, 1.15], [-20, 54, 1.1], [20, 12, 1]], tone: 0.92 },
];

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Scroll-driven background: blob positions and the brass tone layer follow
 * one ScrollTrigger across the whole page (transform + opacity only).
 */
export function initBackground() {
  const wraps = $$('.blob-wrap');
  const tone = $('.bg-tone');
  if (wraps.length !== 3 || !tone) return;

  const setters = wraps.map((w) => ({
    x: gsap.quickSetter(w, 'x', 'px'),
    y: gsap.quickSetter(w, 'y', 'px'),
    s: gsap.quickSetter(w, 'scale'),
  }));
  const setTone = gsap.quickSetter(tone, 'opacity');
  const sections = STOPS.map((s) => document.querySelector(s.sel));
  let tops: number[] = [];
  let vw = window.innerWidth;
  let vh = window.innerHeight;

  const measure = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    tops = sections.map((el) => (el ? el.getBoundingClientRect().top + window.scrollY : 0));
  };

  const update = () => {
    if (!tops.length) return;
    const p = window.scrollY + vh * 0.5;
    let i = 0;
    while (i < tops.length - 2 && p >= tops[i + 1]) i++;
    const span = Math.max(1, tops[i + 1] - tops[i]);
    const t = smooth(gsap.utils.clamp(0, 1, (p - tops[i]) / span));
    const a = STOPS[i];
    const b = STOPS[i + 1];
    for (let k = 0; k < 3; k++) {
      const [ax, ay, as] = a.blobs[k];
      const [bx, by, bs] = b.blobs[k];
      setters[k].x(((ax + (bx - ax) * t) * vw) / 100);
      setters[k].y(((ay + (by - ay) * t) * vh) / 100);
      setters[k].s(as + (bs - as) * t);
    }
    setTone(a.tone + (b.tone - a.tone) * t);
  };

  measure();
  update();
  ScrollTrigger.addEventListener('refresh', () => {
    measure();
    update();
  });
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update });
}

/** Pause CSS loops (blobs, chip, caret) while the tab is hidden. */
export function initVisibility() {
  const root = document.documentElement;
  document.addEventListener('visibilitychange', () => root.classList.toggle('is-hidden', document.hidden));
}
