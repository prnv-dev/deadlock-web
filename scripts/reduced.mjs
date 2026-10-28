// prefers-reduced-motion and JavaScript-disabled runs: everything must be
// visible and static. Saves full-page screenshots and prints assertions.
//   npm run build && node scripts/reduced.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { scrollThrough, serveDist } from './serve.mjs';

const out = fileURLToPath(new URL('../shots/reduced/', import.meta.url));
mkdirSync(out, { recursive: true });
const { url, close } = await serveDist(4194);
const browser = await chromium.launch();
const report = {};

const inspect = (page) =>
  page.evaluate(() => {
    const targets = [...document.querySelectorAll('[data-reveal], [data-card], [data-split], .rkey-grid span, .divider path, [data-draw]')];
    const hidden = targets.filter((el) => {
      const cs = getComputedStyle(el);
      return +cs.opacity < 1 || (cs.strokeDashoffset && cs.strokeDashoffset !== '0px' && cs.strokeDashoffset !== '0');
    });
    const running = document.getAnimations().filter((a) => a.playState === 'running');
    return {
      revealTargets: targets.length,
      notFullyVisible: hidden.map((el) => el.className?.baseVal ?? el.className).slice(0, 10),
      runningAnimations: running.map((a) => a.animationName || a.constructor.name),
      introClass: document.documentElement.classList.contains('intro'),
      lenis: document.documentElement.classList.contains('lenis'),
      stepsPinned: !!document.querySelector('.steps-section.is-pinned'),
      boltTransform: document.querySelector('.bolt-scrub').getAttribute('transform'),
    };
  });

for (const [label, vp] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
  // Reduced motion
  {
    const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce', isMobile: vp.width < 500, hasTouch: vp.width < 500 });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, 1));
    await page.waitForFunction(() => window.__appReady || document.querySelector('.faq-item'), null);
    await page.waitForTimeout(2500);
    const atTop = await inspect(page);
    await scrollThrough(page, 0.8, 120);
    await page.waitForTimeout(600);
    const afterScroll = await inspect(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}reduced-motion-${label}.png`, fullPage: true });
    report[`reduced-motion ${label}`] = { atTop, afterScroll };
    await ctx.close();
  }
  // JavaScript disabled
  {
    const ctx = await browser.newContext({ viewport: vp, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const targets = [...document.querySelectorAll('[data-reveal], [data-card], [data-split], .hero-title, .hero-sub, .lock-card')];
      return { checked: targets.length, notFullyVisible: targets.filter((el) => +getComputedStyle(el).opacity < 1).length, htmlClass: document.documentElement.className };
    });
    await page.screenshot({ path: `${out}no-js-${label}.png`, fullPage: true });
    report[`javascript-disabled ${label}`] = r;
    await ctx.close();
  }
}

await browser.close();
await close();
writeFileSync(`${out}report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
