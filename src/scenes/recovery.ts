import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env, isInView } from '../motion/env';

/** Example recovery key: 14 groups flip in, row by row. */
export default function initRecovery(root: HTMLElement) {
  if (env.reduced || isInView(root, 0.85)) return;
  const cells = root.querySelectorAll('.rkey-grid span');
  gsap.set(cells, { rotationX: -90, opacity: 0, transformOrigin: '50% 0%', transformPerspective: 600 });
  ScrollTrigger.create({
    trigger: root,
    start: 'top 85%',
    once: true,
    onEnter: () =>
      gsap.to(cells, {
        rotationX: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        stagger: { each: 0.045, from: 'start' },
        delay: 0.15,
        clearProps: 'transform',
      }),
  });
}
