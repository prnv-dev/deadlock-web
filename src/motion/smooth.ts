import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from './env';

export let lenis: Lenis | null = null;

/**
 * Lenis smooth scrolling for wheel/trackpad, driven by the GSAP ticker so
 * Lenis and ScrollTrigger update in the same frame. Touch devices keep
 * native momentum scrolling (no Lenis instance at all).
 */
export function initSmoothScroll() {
  if (env.reduced || env.touch) return;
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function stopScroll() {
  lenis?.stop();
}

export function startScroll() {
  lenis?.start();
}
