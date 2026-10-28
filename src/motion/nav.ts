import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, EASE_OUT, env } from './env';

/** Floating pill shrinks after 80px; a single brass underline tracks the current section. */
export function initNav() {
  const header = $('.site-header');
  if (!header) return;

  ScrollTrigger.create({
    start: 80,
    end: 'max',
    onToggle: (self) => header.classList.toggle('is-compact', self.isActive),
  });

  const indicator = $('.nav-indicator');
  const links = $$<HTMLAnchorElement>('[data-nav]');
  if (!indicator || !links.length) return;
  let current: string | null = null;
  const dur = env.reduced ? 0 : 0.6;

  const setActive = (id: string | null) => {
    if (id === current) return;
    current = id;
    const link = links.find((l) => l.dataset.nav === id) ?? null;
    links.forEach((l) => (l === link ? l.setAttribute('aria-current', 'true') : l.removeAttribute('aria-current')));
    if (!link) {
      gsap.to(indicator, { opacity: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      return;
    }
    const inset = 14;
    const x = link.offsetLeft + inset;
    const w = Math.max(8, link.offsetWidth - inset * 2);
    const wasHidden = Number(gsap.getProperty(indicator, 'opacity')) < 0.05;
    if (wasHidden) gsap.set(indicator, { x, scaleX: w / 100 });
    gsap.to(indicator, { x, scaleX: w / 100, opacity: 1, duration: dur, ease: EASE_OUT, overwrite: 'auto' });
  };

  for (const link of links) {
    const section = document.getElementById(link.dataset.nav!);
    if (!section) continue;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (self) => {
        if (self.isActive) setActive(link.dataset.nav!);
        else if (current === link.dataset.nav) setActive(null);
      },
    });
  }
}
