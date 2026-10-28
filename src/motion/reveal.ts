import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$, EASE_IN_OUT, EASE_OUT, env, isInView } from './env';
import { splitLines, type SplitResult } from './split';

/** Hide SVG strokes so they can be drawn on (pathLength="1" on every path). */
export const hideStrokes = (paths: Element[]) =>
  gsap.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 });

export const drawStrokes = (paths: Element[], delay = 0) =>
  gsap.to(paths, {
    strokeDashoffset: 0,
    duration: 1.1,
    ease: EASE_IN_OUT,
    stagger: 0.12,
    delay,
    onComplete: () => gsap.set(paths, { clearProps: 'strokeDasharray,strokeDashoffset' }),
  });

/** Headings: masked line rise. */
function initHeadings() {
  for (const el of $$('[data-split]')) {
    if (isInView(el)) continue;
    let split: SplitResult = splitLines(el);
    gsap.set(split.lines, { yPercent: 110 });
    let width = el.offsetWidth;

    // If the width changes before the reveal, re-measure the lines.
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth === width) return;
      width = el.offsetWidth;
      split.revert();
      split = splitLines(el);
      gsap.set(split.lines, { yPercent: 110 });
    });
    ro.observe(el);

    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        ro.disconnect();
        gsap.to(split.lines, {
          yPercent: 0,
          duration: 1.05,
          ease: EASE_OUT,
          stagger: 0.08,
          onComplete: () => split.revert(),
        });
      },
    });
  }
}

/** Generic rise + fade, batched so neighbours stagger. */
function initItems() {
  const items = $$('[data-reveal]').filter((el) => !isInView(el));
  gsap.set(items, { opacity: 0, y: 28 });
  ScrollTrigger.batch(items, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.95,
        ease: EASE_OUT,
        stagger: 0.08,
        overwrite: true,
        clearProps: 'transform',
      }),
  });
}

/** Bento cards: a staggered wave, then each card draws its icon. */
function initCards() {
  const cards = $$('[data-card]').filter((el) => !isInView(el, 0.98));
  gsap.set(cards, { opacity: 0, y: 32, scale: 0.985 });
  cards.forEach((card) => hideStrokes($$('[data-draw]', card)));
  ScrollTrigger.batch(cards, {
    start: 'top 88%',
    once: true,
    interval: 0.12,
    onEnter: (batch) => {
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1,
        ease: EASE_OUT,
        stagger: 0.09,
        overwrite: true,
        clearProps: 'transform',
      });
      batch.forEach((card, i) => drawStrokes($$('[data-draw]', card), 0.25 + i * 0.09));
    },
  });
}

/** Hand-drawn section dividers draw themselves in. */
function initDividers() {
  for (const path of $$<SVGPathElement>('.divider path')) {
    if (isInView(path)) continue;
    gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
    ScrollTrigger.create({
      trigger: path,
      start: 'top 92%',
      once: true,
      onEnter: () => gsap.to(path, { strokeDashoffset: 0, duration: 1.6, ease: EASE_IN_OUT }),
    });
  }
}

/** Final CTA card settles from .96 to 1 as it enters. */
function initCta() {
  const cta = document.querySelector('[data-cta]');
  if (!cta) return;
  gsap.fromTo(
    cta,
    { scale: 0.96 },
    {
      scale: 1,
      ease: 'power2.out',
      scrollTrigger: { trigger: cta, start: 'top bottom', end: 'top 55%', scrub: 0.6 },
    },
  );
}

/** Reduced motion: no movement, content appears with a short fade. */
function initReduced() {
  const items = $$('[data-reveal], [data-card], [data-split]').filter((el) => !isInView(el));
  gsap.set(items, { opacity: 0 });
  ScrollTrigger.batch(items, {
    start: 'top 95%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, duration: 0.35, ease: 'power1.out', overwrite: true }),
  });
}

export function initReveals() {
  if (env.reduced) {
    initReduced();
    return;
  }
  initHeadings();
  initItems();
  initCards();
  initDividers();
  initCta();
}
