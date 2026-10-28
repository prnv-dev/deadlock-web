import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { env } from './env';
import { lenis } from './smooth';

const navOffset = () => {
  const nav = document.querySelector('.nav');
  const bottom = nav ? nav.getBoundingClientRect().bottom : 72;
  return Math.max(bottom, 72) + 20;
};

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function focusTarget(target: HTMLElement) {
  const tag = target.tagName;
  const heading =
    tag === 'SECTION'
      ? target.querySelector<HTMLElement>('h1, h2')
      : tag === 'DETAILS'
        ? target.querySelector<HTMLElement>('summary')
        : target;
  heading?.focus({ preventScroll: true });
}

function targetY(target: HTMLElement) {
  if (target.id === 'top') return 0;
  const y = target.getBoundingClientRect().top + window.scrollY - navOffset();
  return Math.max(0, Math.round(y));
}

function jump(y: number) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
  ScrollTrigger.update();
}

/**
 * Scrolls to an in-page target with an offset for the floating nav, then
 * moves focus there. Long jumps (more than 3 screens) use a View Transition
 * cross-fade where supported, instead of racing through every section.
 */
export function navigateTo(target: HTMLElement, hash?: string) {
  if (target instanceof HTMLDetailsElement && !target.open) {
    target.open = true;
    ScrollTrigger.refresh();
  }
  if (hash) history.pushState(null, '', hash);
  const y = targetY(target);
  const distance = Math.abs(y - window.scrollY);
  const done = () => focusTarget(target);

  if (env.reduced) {
    jump(y);
    done();
    return;
  }

  if (document.startViewTransition && distance > window.innerHeight * 3) {
    const vt = document.startViewTransition(() => jump(y));
    vt.finished.finally(done);
    return;
  }

  if (lenis) {
    lenis.scrollTo(y, {
      duration: Math.min(1.5, 0.8 + distance / 5000),
      easing: easeInOutCubic,
      force: true,
      onComplete: done,
    });
  } else {
    window.scrollTo({ top: y, behavior: 'smooth' });
    let timer = 0;
    const onEnd = () => {
      window.clearTimeout(timer);
      window.removeEventListener('scrollend', onEnd);
      done();
    };
    window.addEventListener('scrollend', onEnd);
    timer = window.setTimeout(onEnd, 1500);
  }
}

export function resolveHash(href: string | null): HTMLElement | null {
  if (!href || !href.startsWith('#') || href.length < 2) return null;
  return document.getElementById(decodeURIComponent(href.slice(1)));
}

export function initAnchors() {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link || link.hasAttribute('data-sheet-link')) return;
    const target = resolveHash(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    navigateTo(target, link.getAttribute('href')!);
  });
}
