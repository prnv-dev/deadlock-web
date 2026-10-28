/**
 * Minimal line splitter for headings.
 * Words (text plus any simple inline markup glued to them, such as the
 * <span class="p"> punctuation wrappers) are measured, grouped by their rendered
 * line, then wrapped as <span class="line"><span class="line-in">…</span></span>.
 * `revert()` restores the original markup once the reveal is done, so later
 * resizes reflow naturally.
 */
const TOKEN = /(?:<[^>]+>[^<]*<\/[^>]+>|[^\s<]+)+/g;

export interface SplitResult {
  lines: HTMLElement[];
  revert: () => void;
}

export function splitLines(el: HTMLElement): SplitResult {
  const original = el.innerHTML;
  const words = original.trim().match(TOKEN) ?? [];
  el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');

  const groups: string[][] = [];
  let lastTop = Number.NEGATIVE_INFINITY;
  el.querySelectorAll<HTMLElement>('.w').forEach((span) => {
    const top = span.offsetTop;
    if (Math.abs(top - lastTop) > 4) {
      groups.push([]);
      lastTop = top;
    }
    groups[groups.length - 1].push(span.innerHTML);
  });

  el.innerHTML = groups
    .map((g) => `<span class="line"><span class="line-in">${g.join(' ')}</span></span>`)
    .join(' ');

  return {
    lines: Array.from(el.querySelectorAll<HTMLElement>('.line-in')),
    revert: () => {
      el.innerHTML = original;
    },
  };
}
