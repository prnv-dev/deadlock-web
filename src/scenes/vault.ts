import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from '../motion/env';

/**
 * "Add to Vault": three files drift toward the vault door. Each file exists
 * twice (plain + encrypted) under two static clip paths split at the brass
 * line, so moving the pair with one transform makes the file turn into
 * cipher blocks exactly where it crosses the line. Plays only while visible.
 * The markup itself is the reduced-motion / no-JS final frame.
 */
export default function initVault(root: HTMLElement) {
  if (env.reduced) return;
  const svg = root.querySelector('svg')!;
  const wheel = svg.querySelector('.v-wheel');
  const flashes = svg.querySelectorAll('.v-flash');
  // Card centre offset to the door centre (560, 140) per lane.
  const laneDy = [68, 0, -68];
  const DOOR_X = 506;
  const PERIOD = 4.35;

  const master = gsap.timeline({ paused: true });

  for (let i = 0; i < 3; i++) {
    const pair = svg.querySelectorAll(`.v-file[data-file="${i}"]`);
    const tl = gsap.timeline({ repeat: -1, repeatDelay: PERIOD - 4.3 });
    tl.fromTo(
      pair,
      { x: -6, y: 0, scale: 1, opacity: 0, transformOrigin: '50% 50%' },
      { x: 34, opacity: 1, duration: 0.6, ease: 'power2.out', immediateRender: true },
    )
      .to(pair, { x: 430, duration: 3, ease: 'sine.inOut' })
      .to(pair, { x: DOOR_X, y: laneDy[i], scale: 0.3, opacity: 0, duration: 0.7, ease: 'power2.in' });
    if (!env.touch) {
      tl.to(flashes[i], { opacity: 0.5, duration: 0.22, ease: 'sine.out' }, 0.6 + 1.62).to(
        flashes[i],
        { opacity: 0, duration: 0.5, ease: 'sine.inOut' },
        '>',
      );
      tl.call(
        () => {
          gsap.to(wheel, { rotation: '+=60', svgOrigin: '560 140', duration: 0.9, ease: 'power3.inOut' });
        },
        [],
        3.75,
      );
    }
    master.add(tl, i * (PERIOD / 3));
  }

  // Start mid-stream so the first frame is not empty.
  master.time(PERIOD * 1.2);

  ScrollTrigger.create({
    trigger: root,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (self.isActive && !document.hidden ? master.play() : master.pause()),
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) master.pause();
    else if (ScrollTrigger.isInViewport(root)) master.play();
  });
}
