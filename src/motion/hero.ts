import { gsap } from 'gsap';
import { $ } from './env';

/**
 * Scroll-linked deadbolt: while the hero scrolls past, the bolt retracts
 * ("unlock") and slides back in ("re-lock") as the hero leaves.
 * The load-time lock is pure CSS (motion.css) on an outer <g>, so the two
 * never fight over the same transform.
 */
export function initHeroBolt() {
  const mark = $('.lock-mark');
  const bar = $<SVGGElement>('.bolt-scrub');
  const locked = $('.status-locked');
  const open = $('.status-open');
  if (!mark || !bar || !locked || !open) return;

  // From the top of the page until the mark slides under the floating nav.
  const markLeaves = () => {
    const top = mark.getBoundingClientRect().top + window.scrollY;
    return Math.max(320, Math.round(top - 90));
  };

  gsap
    .timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: { start: 0, end: markLeaves, scrub: 0.7, invalidateOnRefresh: true },
    })
    .to(bar, { x: -104, duration: 1 }, 0)
    .to(locked, { opacity: 0, duration: 0.25 }, 0.4)
    .to(open, { opacity: 1, duration: 0.25 }, 0.4)
    .to(bar, { x: 0, duration: 1 }, 1)
    .to(open, { opacity: 0, duration: 0.25 }, 1.45)
    .to(locked, { opacity: 1, duration: 0.25 }, 1.45);
}

/** Very subtle 3D tilt of the lock card (max 4 deg), fine pointers only. */
export function initTilt() {
  const zone = $('[data-tilt-zone]');
  const card = $('[data-tilt]');
  if (!zone || !card) return;
  const MAX = 4;
  gsap.set(card, { transformPerspective: 1100 });
  const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3.out' });
  const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3.out' });
  let rect = zone.getBoundingClientRect();

  zone.addEventListener('pointerenter', () => {
    rect = zone.getBoundingClientRect();
  });
  zone.addEventListener('pointermove', (e) => {
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ry(gsap.utils.clamp(-MAX, MAX, px * MAX * 2));
    rx(gsap.utils.clamp(-MAX, MAX, -py * MAX * 2));
  });
  zone.addEventListener('pointerleave', () => {
    rx(0);
    ry(0);
  });
}
