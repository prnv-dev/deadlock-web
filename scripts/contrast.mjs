// WCAG AA contrast gate over the brand tokens in src/styles/tokens.css.
// Exits non-zero (and so fails `npm run build`) if any pair is below its minimum.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)), 'utf8');

function block(name) {
  const m = css.match(new RegExp(String.raw`/\*\s*@tokens ${name}\s*\*/([\s\S]*?)/\*\s*@end\s*\*/`));
  if (!m) throw new Error(`tokens.css: missing "@tokens ${name}" block`);
  const out = {};
  for (const [, k, v] of m[1].matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) out[k] = v.toUpperCase();
  return out;
}

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const BODY = 4.5;
const LARGE = 3;
const UI = 3;
const surfaces = ['bg', 'surface', 'surface-2', 'well'];
const pairs = [
  ...surfaces.flatMap((s) => [
    ['text', s, BODY, 'body text'],
    ['muted', s, BODY, 'secondary text'],
    ['brass-ink', s, BODY, 'eyebrows, links, tags'],
  ]),
  ['on-brass', 'btn-a', BODY, 'primary button label (gradient top)'],
  ['on-brass', 'btn-b', BODY, 'primary button label (gradient bottom)'],
  ['on-brass', 'cta-a', BODY, 'CTA band text (lightest stop)'],
  ['on-brass', 'cta-b', BODY, 'CTA band text (darkest stop)'],
  ['cta-btn-ink', 'cta-btn', BODY, 'CTA button label'],
  ['brass', 'bg', UI, 'focus ring / icons on page'],
  ['brass', 'surface', UI, 'focus ring / icons on cards'],
  ['brass', 'well', UI, 'icon strokes in wells'],
  ['text', 'bg', LARGE, 'headings (large)'],
];

const themes = { light: block('light'), dark: block('dark'), 'dark-system': block('dark-system') };
let failed = 0;

// The two dark blocks must stay identical (one for the toggle, one for the OS preference).
for (const k of new Set([...Object.keys(themes.dark), ...Object.keys(themes['dark-system'])])) {
  if (themes.dark[k] !== themes['dark-system'][k]) {
    console.error(`x dark and dark-system differ for --${k}: ${themes.dark[k]} vs ${themes['dark-system'][k]}`);
    failed++;
  }
}

for (const name of ['light', 'dark']) {
  const t = themes[name];
  console.log(`\n${name.toUpperCase()} THEME`);
  for (const [fg, bg, min, use] of pairs) {
    if (!t[fg] || !t[bg]) {
      console.error(`x missing token --${fg} or --${bg}`);
      failed++;
      continue;
    }
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(
      `${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  --${fg} ${t[fg]} on --${bg} ${t[bg]}  ${use}`,
    );
  }
}

if (failed) {
  console.error(`\nContrast check failed: ${failed} problem(s).`);
  process.exit(1);
}
console.log(`\nAll ${pairs.length * 2} pairs pass WCAG AA.`);
