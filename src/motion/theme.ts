import { $$, env } from './env';

type Theme = 'light' | 'dark';
const KEY = 'dl-theme';
const root = document.documentElement;
const BG: Record<Theme, string> = { light: '#F3EADF', dark: '#14100B' };

const current = (): Theme => {
  const t = root.getAttribute('data-theme');
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

function syncControls() {
  const next = current() === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} theme`;
  for (const btn of $$('[data-theme-toggle]')) {
    const text = btn.querySelector('[data-theme-label]');
    if (text) text.textContent = label;
    else btn.setAttribute('aria-label', label);
  }
}

function apply(theme: Theme) {
  root.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable: the choice lasts for this page view */
  }
  for (const meta of $$<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = BG[theme];
  syncControls();
}

/**
 * Theme toggle. Remembers the choice; otherwise follows the OS setting.
 * Where View Transitions exist, the new theme is revealed as a circle
 * growing out of the button that was pressed.
 */
export function initTheme() {
  syncControls();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncControls);

  for (const btn of $$('[data-theme-toggle]')) {
    btn.addEventListener('click', () => {
      const next: Theme = current() === 'dark' ? 'light' : 'dark';
      if (!document.startViewTransition || env.reduced) {
        apply(next);
        return;
      }
      const r = btn.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add('vt-theme');
      const vt = document.startViewTransition(() => apply(next));
      vt.ready
        .then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 750, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' },
          );
        })
        .catch(() => {});
      vt.finished.finally(() => root.classList.remove('vt-theme'));
    });
  }
}
