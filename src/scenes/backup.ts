import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASE_IN_OUT, env, isInView } from '../motion/env';

/** Backup: the brass line draws from one folder to the other, then a check draws on the copy. */
export default function initBackup(root: HTMLElement) {
  if (env.reduced || isInView(root, 0.85)) return;
  const line = root.querySelector('.b-line');
  const badge = root.querySelector('.b-badge');
  const check = root.querySelector('.b-check');
  if (!line || !badge || !check) return;
  gsap.set([line, check], { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(badge, { scale: 0, transformOrigin: '50% 50%' });
  ScrollTrigger.create({
    trigger: root,
    start: 'top 85%',
    once: true,
    onEnter: () =>
      gsap
        .timeline({ delay: 0.35 })
        .to(line, { strokeDashoffset: 0, duration: 1.1, ease: EASE_IN_OUT })
        .to(badge, { scale: 1, duration: 0.55, ease: 'back.out(1.8)' }, '-=0.1')
        .to(check, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, '-=0.25'),
  });
}
