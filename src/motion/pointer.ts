import { gsap } from 'gsap';
import { $, $$ } from './env';

/** Primary buttons drift toward the cursor (max 8px) and spring back. */
export function initMagnetic() {
  const MAX = 8;
  for (const btn of $$('[data-magnetic]')) {
    let rect = btn.getBoundingClientRect();
    btn.addEventListener('pointerenter', () => {
      rect = btn.getBoundingClientRect();
    });
    btn.addEventListener('pointermove', (e) => {
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      gsap.to(btn, {
        x: gsap.utils.clamp(-MAX, MAX, dx * 0.25),
        y: gsap.utils.clamp(-MAX, MAX, dy * 0.35),
        duration: 0.45,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    });
    btn.addEventListener('pointerleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)', overwrite: 'auto' });
    });
  }
}

/**
 * Bento cards: a warm radial highlight follows the cursor. Coordinates are
 * written once per frame as CSS variables consumed by a transform.
 */
export function initCardGlow() {
  const grid = $('[data-bento]');
  if (!grid) return;
  let raf = 0;
  let card: HTMLElement | null = null;
  let x = 0;
  let y = 0;

  const apply = () => {
    raf = 0;
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--gx', `${Math.round(x - r.left)}px`);
    card.style.setProperty('--gy', `${Math.round(y - r.top)}px`);
  };

  grid.addEventListener('pointermove', (e) => {
    card = (e.target as Element).closest<HTMLElement>('[data-card]');
    x = e.clientX;
    y = e.clientY;
    if (!raf) raf = requestAnimationFrame(apply);
  });
}
