// Frame-time measurement while scrolling the whole page with real (synthesized)
// input gestures. Desktop: wheel gesture (Lenis active). Phone: touch gesture
// with 4x CPU slowdown (native scroll). Reports rAF frame intervals.
//   npm run build && node scripts/perf.mjs [--headed]
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serveDist } from './serve.mjs';

const headed = process.argv.includes('--headed');
const out = fileURLToPath(new URL(`../shots/perf-${headed ? 'headed' : 'headless'}.json`, import.meta.url));
const { url, close } = await serveDist(4193);
const browser = await chromium.launch(headed ? { headless: false, channel: 'chrome' } : {});

const CASES = [
  { name: 'desktop 1280x800, wheel', viewport: { width: 1280, height: 800 }, cpu: 1, source: 'mouse' },
  { name: 'desktop 1920x1080, wheel', viewport: { width: 1920, height: 1080 }, cpu: 1, source: 'mouse' },
  { name: 'phone 390x844, touch, 4x CPU slowdown', viewport: { width: 390, height: 844 }, cpu: 4, source: 'touch', mobile: true },
];

const results = [];
for (const c of CASES) {
  const ctx = await browser.newContext({ viewport: c.viewport, isMobile: !!c.mobile, hasTouch: !!c.mobile, deviceScaleFactor: c.mobile ? 2 : 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 1));
  await page.waitForFunction(() => document.querySelector('.steps-section.is-enhanced'), null, { timeout: 8000 });
  await page.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: c.cpu });

  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const loop = (t) => {
      window.__frames.push(t - last);
      last = t;
      if (!window.__stop) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  // Scroll down in chunks so the gesture never exceeds the viewport bounds.
  let scrolled = 0;
  while (scrolled < total - 50) {
    const d = Math.min(1800, total - scrolled);
    await cdp.send('Input.synthesizeScrollGesture', {
      x: Math.round(c.viewport.width / 2),
      y: Math.round(c.viewport.height * 0.6),
      yDistance: -d,
      speed: c.source === 'touch' ? 1600 : 1400,
      gestureSourceType: c.source,
      preventFling: true,
    });
    scrolled += d;
  }
  await page.waitForTimeout(800);
  const frames = await page.evaluate(() => {
    window.__stop = true;
    return window.__frames.slice(2);
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const sorted = [...frames].sort((a, b) => a - b);
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  results.push({
    case: c.name,
    frames: frames.length,
    'avg fps': +(1000 / avg).toFixed(1),
    'median ms': +pct(0.5).toFixed(1),
    'p95 ms': +pct(0.95).toFixed(1),
    'p99 ms': +pct(0.99).toFixed(1),
    'frames > 25ms': frames.filter((f) => f > 25).length,
    '% > 25ms': +((100 * frames.filter((f) => f > 25).length) / frames.length).toFixed(1),
  });
  await ctx.close();
}

await browser.close();
await close();
console.table(results);
writeFileSync(out, JSON.stringify({ headed, results }, null, 2));
