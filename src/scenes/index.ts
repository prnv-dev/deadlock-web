/**
 * Below-the-fold scenes are code-split and only loaded when they come
 * within 400px of the viewport. Their markup is already in the HTML, so
 * without JS (or before load) the final frame is shown.
 */
const loaders: Record<string, () => Promise<{ default: (root: HTMLElement) => void }>> = {
  vault: () => import('./vault'),
  recovery: () => import('./recovery'),
  backup: () => import('./backup'),
};

export function initScenes() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        const el = entry.target as HTMLElement;
        loaders[el.dataset.scene!]?.().then((m) => m.default(el));
      }
    },
    { rootMargin: '400px 0px' },
  );
  document.querySelectorAll('[data-scene]').forEach((el) => io.observe(el));
}
