// Full-page screenshots at the required widths in light and dark, plus layout
// checks (horizontal overflow, small touch targets, CLS) at more widths.
//   npm run build && npm run shots
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { scrollThrough, serveDist } from './serve.mjs';

const out = fileURLToPath(new URL('../shots/', import.meta.url));
mkdirSync(out, { recursive: true });

const SHOT_WIDTHS = [360, 390, 768, 1280, 1920];
const CHECK_SIZES = [
  { w: 360, h: 780, mobile: true },
  { w: 390, h: 844, mobile: true },
  { w: 430, h: 932, mobile: true },
  { w: 768, h: 1024, mobile: true },
  { w: 1024, h: 768 },
  { w: 1280, h: 800 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
  { w: 844, h: 390, mobile: true, label: 'phone-landscape' },
];
const heightFor = (w) => (w < 500 ? 820 : w < 1000 ? 1024 : w < 1500 ? 800 : 1080);

const { url, close } = await serveDist();
const browser = await chromium.launch();
const report = [];

async function audit(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const small = [];
    for (const el of document.querySelectorAll('a[href], button, summary')) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || cs.visibility === 'hidden' || el.closest('dialog:not([open])')) continue;
      // Inline text links inside sentences are exempt (WCAG 2.5.8 inline exception).
      if (cs.display === 'inline') continue;
      if (r.width < 44 || r.height < 44) small.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const h1Lines = [...document.querySelectorAll('.hero-title .line-in')].map((l) => Math.round(l.getBoundingClientRect().height / parseFloat(getComputedStyle(l).lineHeight)));
    return { overflow, small, h1Lines };
  });
}

for (const size of CHECK_SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, isMobile: !!size.mobile, hasTouch: !!size.mobile, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const top = await audit(page);
  await scrollThrough(page);
  const after = await audit(page);
  const cls = await page.evaluate(() => window.__cls);
  const label = size.label ?? `${size.w}x${size.h}`;
  report.push({ size: label, overflowPx: Math.max(top.overflow, after.overflow), cls: +cls.toFixed(4), smallTargets: after.small, h1RowsPerLine: top.h1Lines });
  if (size.label) await page.screenshot({ path: `${out}${size.label}.png` });
  await ctx.close();
}

for (const theme of ['light', 'dark']) {
  for (const w of SHOT_WIDTHS) {
    const mobile = w < 1000;
    const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, colorScheme: theme, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${out}${w}-${theme}-fold.png` });
    await scrollThrough(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}${w}-${theme}-full.png`, fullPage: true });
    await ctx.close();
  }
}

await browser.close();
await close();
writeFileSync(`${out}layout-report.json`, JSON.stringify(report, null, 2));
console.table(report.map((r) => ({ ...r, smallTargets: r.smallTargets.length, h1RowsPerLine: r.h1RowsPerLine.join('+') })));
for (const r of report) if (r.smallTargets.length) console.log(r.size, r.smallTargets);
