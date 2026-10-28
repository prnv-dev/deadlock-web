import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$, env } from './env';

const EASE = 'cubic-bezier(.22, 1, .36, 1)';
const DURATION = 520;

/**
 * Native <details> accordion with a smooth open/close that animates only
 * transform and opacity: the panel fades in while everything below it is
 * moved with a FLIP translate, instead of animating height.
 */
export function initFaq() {
  const items = $$<HTMLDetailsElement>('.faq-item');
  const followersOf = (item: HTMLDetailsElement) => {
    const list: HTMLElement[] = [];
    let n = item.nextElementSibling;
    while (n) {
      list.push(n as HTMLElement);
      n = n.nextElementSibling;
    }
    return list.concat($$('[data-flip-follow]'));
  };
  let refreshTimer = 0;
  const refresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
  };

  for (const item of items) {
    const summary = item.querySelector('summary')!;
    const body = item.querySelector<HTMLElement>('.faq-body')!;
    let running: Animation[] = [];

    summary.addEventListener('click', (e) => {
      if (env.reduced) {
        refresh();
        return; // native, instant toggle
      }
      e.preventDefault();
      running.forEach((a) => a.finish());
      running = [];

      const followers = followersOf(item);
      const opts: KeyframeAnimationOptions = { duration: DURATION, easing: EASE };

      if (!item.open) {
        const before = item.offsetHeight;
        item.open = true;
        const delta = item.offsetHeight - before;
        running = [
          body.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], opts),
          ...followers.map((f) => f.animate([{ transform: `translateY(${-delta}px)` }, { transform: 'none' }], opts)),
        ];
        running[0].finished.then(refresh, () => {});
      } else {
        const openHeight = item.offsetHeight;
        item.open = false;
        const delta = openHeight - item.offsetHeight;
        item.open = true;
        item.classList.add('is-closing');
        const close: KeyframeAnimationOptions = { ...opts, duration: DURATION * 0.85, fill: 'forwards' };
        const anims = [
          body.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], {
            ...close,
            duration: DURATION * 0.5,
          }),
          ...followers.map((f) => f.animate([{ transform: 'none' }, { transform: `translateY(${-delta}px)` }], close)),
        ];
        running = anims;
        Promise.all(anims.map((a) => a.finished)).then(
          () => {
            // Collapse and drop the transforms in the same frame: no jump.
            item.open = false;
            item.classList.remove('is-closing');
            anims.forEach((a) => a.cancel());
            refresh();
          },
          () => {},
        );
      }
    });
  }
}
