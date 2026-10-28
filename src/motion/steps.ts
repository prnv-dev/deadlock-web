import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$, env } from './env';
import { drawStrokes, hideStrokes } from './reveal';

/**
 * "How it works".
 * Desktop (>= 1024 wide, >= 680 tall): the stage pins and the four steps pan
 *   horizontally while the rail fills between them.
 * Smaller screens: a vertical timeline whose rail draws as you scroll.
 * Reduced motion: static layout, everything visible.
 */
export function initSteps() {
  const section = $('.steps-section');
  const stage = $('.steps-stage');
  const viewport = $('.steps-viewport');
  const track = $('.steps-track');
  const fill = $('.steps-rail-fill');
  const steps = $$('[data-step]');
  if (!section || !stage || !viewport || !track || !fill || !steps.length || env.reduced) return;

  section.classList.add('is-enhanced');
  const drawn = new Set<Element>();
  steps.forEach((s) => hideStrokes($$('[data-draw]', s)));

  const activate = (count: number) => {
    steps.forEach((s, i) => {
      const on = i < count;
      s.classList.toggle('is-active', on);
      if (on && !drawn.has(s)) {
        drawn.add(s);
        drawStrokes($$('[data-draw]', s), 0.1);
      }
    });
  };

  const mm = gsap.matchMedia();

  mm.add('(min-width: 1024px) and (min-height: 680px)', () => {
    section.classList.add('is-pinned');
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth + 16);
    // Rail positions of each step dot, as a 0..1 fraction of the track width.
    let marks: number[] = [];
    const measure = () => {
      const w = track.scrollWidth;
      marks = steps.map((s) => (s.offsetLeft + 10) / w);
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: () => `+=${Math.max(distance() * 1.3, window.innerHeight * 0.9)}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onRefresh: measure,
        onUpdate: (self) => {
          const p = self.progress;
          const reached = marks.filter((m) => m <= p * 1.0001 + 0.02).length;
          activate(Math.max(1, reached));
        },
      },
    });
    tl.to(track, { x: () => -distance(), ease: 'sine.inOut' }, 0).fromTo(
      fill,
      { scaleX: 0 },
      { scaleX: 1, ease: 'sine.inOut' },
      0,
    );
    measure();
    activate(1);

    return () => {
      section.classList.remove('is-pinned');
      gsap.set([track, fill], { clearProps: 'transform' });
    };
  });

  mm.add(
    { narrow: '(max-width: 1023.98px)', short: '(min-width: 1024px) and (max-height: 679.98px)' },
    (ctx) => {
      const vertical = Boolean(ctx.conditions?.narrow);
      const list = $('.steps', section)!;
      gsap.fromTo(
        fill,
        vertical ? { scaleY: 0, scaleX: 1 } : { scaleX: 0, scaleY: 1 },
        {
          [vertical ? 'scaleY' : 'scaleX']: 1,
          ease: 'none',
          scrollTrigger: vertical
            ? { trigger: list, start: 'top 70%', end: 'bottom 70%', scrub: 0.5 }
            : { trigger: list, start: 'top 80%', end: 'bottom 60%', scrub: 0.5 },
        },
      );
      const triggers = steps.map((s, i) =>
        ScrollTrigger.create({
          trigger: s,
          start: vertical ? 'top 72%' : 'top 80%',
          onEnter: () => activate(i + 1),
          onLeaveBack: () => activate(i),
        }),
      );
      return () => {
        triggers.forEach((t) => t.kill());
        gsap.set(fill, { clearProps: 'transform' });
      };
    },
  );
}
