/** Environment flags, read once at startup. */
const mq = (q: string) => window.matchMedia(q);

export const env = {
  reduced: mq('(prefers-reduced-motion: reduce)').matches,
  /** Mouse/trackpad: enables tilt, magnetic and cursor effects. */
  fine: mq('(hover: hover) and (pointer: fine)').matches,
  /** Touch-first device: native scrolling, fewer animated elements. */
  touch: mq('(hover: none) and (pointer: coarse)').matches,
};

/* GSAP equivalents of the CSS easing tokens. */
export const EASE_OUT = 'power4.out'; // ~ cubic-bezier(.22, 1, .36, 1)
export const EASE_IN_OUT = 'power2.inOut'; // ~ cubic-bezier(.65, 0, .35, 1)

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector(sel) as T | null;

export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll(sel)) as T[];

/** True if the element's top edge is already inside the viewport. */
export const isInView = (el: Element, ratio = 0.92) =>
  el.getBoundingClientRect().top < window.innerHeight * ratio;
