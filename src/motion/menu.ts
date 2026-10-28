import { gsap } from 'gsap';
import { $, $$, EASE_OUT, env } from './env';
import { navigateTo, resolveHash } from './anchors';
import { startScroll, stopScroll } from './smooth';

/**
 * Mobile menu: a full-screen modal <dialog>. showModal() makes the rest of
 * the page inert (focus is trapped), Esc closes, body scroll is locked, and
 * focus returns to the menu button on close.
 */
export function initMenu() {
  const dialog = $<HTMLDialogElement>('#mobile-menu');
  const toggle = $('.menu-toggle');
  const closeBtn = $('.sheet-close');
  if (!dialog || !toggle || !closeBtn) return;
  const inner = $('.sheet-inner', dialog)!;
  const links = $$('.sheet-links span', dialog);
  const extras = $$('.sheet-bottom > *', dialog);
  let state: 'closed' | 'open' | 'closing' = 'closed';
  let tl: gsap.core.Timeline | null = null;

  const open = () => {
    if (state !== 'closed') return;
    state = 'open';
    dialog.showModal();
    document.documentElement.classList.add('menu-open');
    stopScroll();
    toggle.setAttribute('aria-expanded', 'true');
    tl?.kill();
    if (env.reduced) {
      tl = gsap.timeline().fromTo(inner, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      return;
    }
    tl = gsap
      .timeline()
      .fromTo(inner, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' })
      .fromTo(links, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: EASE_OUT, stagger: 0.06 }, 0.05)
      .fromTo(extras, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: EASE_OUT, stagger: 0.06 }, 0.2);
  };

  const close = (after?: () => void) => {
    if (state !== 'open') return;
    state = 'closing';
    tl?.kill();
    tl = gsap.timeline({
      onComplete: () => {
        dialog.close();
        after?.();
      },
    });
    if (env.reduced) tl.to(inner, { opacity: 0, duration: 0.15 });
    else
      tl.to(links, { yPercent: -110, duration: 0.35, ease: 'power2.in', stagger: 0.03 }, 0).to(
        inner,
        { opacity: 0, duration: 0.3, ease: 'power2.in' },
        0.12,
      );
  };

  dialog.addEventListener('close', () => {
    state = 'closed';
    tl?.kill();
    gsap.set([inner, ...links, ...extras], { clearProps: 'all' });
    document.documentElement.classList.remove('menu-open');
    startScroll();
    toggle.setAttribute('aria-expanded', 'false');
  });

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    open();
  });
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    // Wrap Tab inside the sheet (showModal alone lets focus reach the browser UI).
    if (e.key !== 'Tab') return;
    const focusable = $$('a[href], button:not([disabled])', dialog).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  for (const link of $$<HTMLAnchorElement>('[data-sheet-link]', dialog)) {
    link.addEventListener('click', (e) => {
      const target = resolveHash(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const hash = link.getAttribute('href')!;
      close(() => navigateTo(target, hash));
    });
  }

  // Leaving the mobile layout while open: close instantly.
  window.matchMedia('(min-width: 920px)').addEventListener('change', (e) => {
    if (e.matches && dialog.open) dialog.close();
  });
}
