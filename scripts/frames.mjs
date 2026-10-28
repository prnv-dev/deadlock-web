// Frame sequences proving the motion works, plus behaviour assertions.
//   npm run build && npm run frames
// Output: shots/frames/<sequence>/NN.png and a contact sheet shots/frames/<sequence>.png
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { serveDist } from './serve.mjs';

const root = fileURLToPath(new URL('../shots/frames/', import.meta.url));
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
const results = {};
const errors = [];

async function sheet(name, frames, cols = 4, thumbW = 400) {
  const metas = await Promise.all(frames.map((f) => sharp(f.buf).metadata()));
  const ratio = metas[0].height / metas[0].width;
  const thumbH = Math.round(thumbW * ratio);
  const rows = Math.ceil(frames.length / cols);
  const pad = 10;
  const labelH = 26;
  const composite = [];
  for (let i = 0; i < frames.length; i++) {
    const x = pad + (i % cols) * (thumbW + pad);
    const y = pad + Math.floor(i / cols) * (thumbH + labelH + pad);
    composite.push({ input: await sharp(frames[i].buf).resize(thumbW, thumbH).png().toBuffer(), left: x, top: y + labelH });
    const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${thumbW}" height="${labelH}"><text x="2" y="18" font-family="Segoe UI, Arial" font-size="15" fill="#2B1D10">${frames[i].label}</text></svg>`;
    composite.push({ input: Buffer.from(label), left: x, top: y });
  }
  await sharp({
    create: { width: pad + cols * (thumbW + pad), height: pad + rows * (thumbH + labelH + pad), channels: 3, background: '#F6ECDD' },
  })
    .composite(composite)
    .png()
    .toFile(`${root}${name}.png`);
  const dir = `${root}${name}/`;
  mkdirSync(dir, { recursive: true });
  frames.forEach((f, i) => writeFileSync(`${dir}${String(i).padStart(2, '0')}.png`, f.buf));
}

/** Records compositor frames with timestamps via CDP screencast. */
async function screencast(page, run, ms) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ t: f.metadata.timestamp * 1000, buf: Buffer.from(f.data, 'base64') });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  const t0 = Date.now();
  await run();
  await page.waitForTimeout(Math.max(0, ms - (Date.now() - t0)));
  await cdp.send('Page.stopScreencast');
  await cdp.detach();
  return frames;
}

const pick = (frames, n) => {
  if (frames.length <= n) return frames;
  return Array.from({ length: n }, (_, i) => frames[Math.round((i * (frames.length - 1)) / (n - 1))]);
};

const appReady = (page) => page.waitForFunction(() => document.querySelector('.steps-section.is-enhanced'), null, { timeout: 8000 });

const { url, close } = await serveDist(4192);
const browser = await chromium.launch();

async function newPage(opts) {
  const ctx = await browser.newContext({ deviceScaleFactor: 1, ...opts });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${m.text()}`));
  page.on('pageerror', (e) => errors.push(String(e)));
  return page;
}

// 1. Intro sequence (first load in a session), desktop and phone.
for (const [label, vp] of [['intro-desktop', { width: 1280, height: 800 }], ['intro-mobile', { width: 390, height: 844 }]]) {
  const page = await newPage({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  await page.goto('about:blank');
  const frames = await screencast(page, () => page.goto(url, { waitUntil: 'commit' }), 1700);
  const t0 = frames[0]?.t ?? 0;
  const chosen = pick(frames, 12).map((f) => ({ ...f, label: `t = ${Math.round(f.t - t0)} ms` }));
  await sheet(label, chosen, vp.width < 500 ? 6 : 4, vp.width < 500 ? 220 : 400);
  results[label] = { framesCaptured: frames.length, spanMs: Math.round((frames.at(-1)?.t ?? 0) - t0) };
  await page.context().close();
}

// 2. Deadbolt: scroll-linked unlock / re-lock while the mark is on screen (desktop + phone).
for (const [label, vp] of [['deadbolt-scroll-desktop', { width: 1280, height: 800 }], ['deadbolt-scroll-mobile', { width: 390, height: 844 }]]) {
  const mobile = vp.width < 500;
  const page = await newPage({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.mouse.move(vp.width / 2, 400);
  await page.evaluate(() => window.scrollTo(0, 1));
  await appReady(page);
  await page.waitForTimeout(1600);
  const end = await page.evaluate(() => Math.max(320, document.querySelector('.lock-mark').getBoundingClientRect().top + scrollY - 90));
  const frames = [];
  const samples = [];
  const steps = 7;
  for (let i = 0; i <= steps; i++) {
    const y = Math.round((end * 1.1 * i) / steps);
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(1300);
    const s = await page.evaluate(() => {
      const m = document.querySelector('.bolt-scrub').transform.baseVal.consolidate()?.matrix;
      return {
        scrollY: Math.round(scrollY),
        boltX: m ? +m.e.toFixed(1) : 0,
        status: +getComputedStyle(document.querySelector('.status-open')).opacity > 0.5 ? 'unlocked' : 'locked',
      };
    });
    samples.push(s);
    frames.push({ buf: await page.screenshot(), label: `y ${s.scrollY}  bolt ${s.boltX}  ${s.status}` });
  }
  await sheet(label, frames, 4, mobile ? 230 : 400);
  results[label] = samples;
  await page.context().close();
}

// 3. Bento reveal wave.
{
  const page = await newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 1);
  await appReady(page);
  await page.waitForTimeout(1500);
  const top = await page.evaluate(() => document.querySelector('[data-bento]').getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => window.scrollTo(0, y - 820), top);
  await page.waitForTimeout(900);
  const before = await page.evaluate(() => [...document.querySelectorAll('[data-card]')].map((c) => +getComputedStyle(c).opacity));
  const frames = await screencast(page, () => page.evaluate((y) => window.scrollTo(0, y - 120), top), 2200);
  const after = await page.evaluate(() => [...document.querySelectorAll('[data-card]')].map((c) => +getComputedStyle(c).opacity));
  const t0 = frames[0]?.t ?? 0;
  await sheet('bento-reveal', pick(frames, 12).map((f) => ({ ...f, label: `t = ${Math.round(f.t - t0)} ms` })), 4, 400);
  results['bento-reveal'] = { opacityBefore: before, opacityAfter: after, framesCaptured: frames.length };
  await page.context().close();
}

// 4. Pinned "How it works" sequence (desktop).
{
  const page = await newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.mouse.wheel(0, 1);
  await appReady(page);
  await page.waitForTimeout(1500);
  const top = await page.evaluate(() => document.querySelector('#how-it-works').getBoundingClientRect().top + scrollY);
  const frames = [];
  const samples = [];
  for (let i = 0; i <= 7; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), top + i * 170);
    await page.waitForTimeout(1100);
    const s = await page.evaluate(() => ({
      trackX: Math.round(new DOMMatrix(getComputedStyle(document.querySelector('.steps-track')).transform).m41),
      rail: +new DOMMatrix(getComputedStyle(document.querySelector('.steps-rail-fill')).transform).a.toFixed(2),
      active: document.querySelectorAll('.step.is-active').length,
    }));
    samples.push(s);
    frames.push({ buf: await page.screenshot(), label: `x ${s.trackX}px  rail ${s.rail}  active ${s.active}` });
  }
  await sheet('steps-pinned', frames, 4, 400);
  results['steps-pinned'] = samples;
  await page.context().close();
}

// 5. Mobile menu: open, focus trap, Esc, focus return.
{
  const page = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 1));
  await appReady(page);
  await page.waitForTimeout(1500);
  const openFrames = await screencast(page, () => page.tap('.menu-toggle'), 1100);
  const state = await page.evaluate(() => ({
    dialogOpen: document.querySelector('#mobile-menu').open,
    ariaExpanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'),
    scrollLocked: document.documentElement.classList.contains('menu-open'),
    focused: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent.trim(),
  }));
  const tabbed = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('Tab');
    tabbed.push(await page.evaluate(() => (document.activeElement?.closest('#mobile-menu') ? 'in-dialog' : `OUTSIDE:${document.activeElement?.tagName}`)));
  }
  const closeFrames = await screencast(page, () => page.keyboard.press('Escape'), 900);
  const afterClose = await page.evaluate(() => ({
    dialogOpen: document.querySelector('#mobile-menu').open,
    ariaExpanded: document.querySelector('.menu-toggle').getAttribute('aria-expanded'),
    scrollLocked: document.documentElement.classList.contains('menu-open'),
    focusReturnedToToggle: document.activeElement === document.querySelector('.menu-toggle'),
  }));
  const t0 = openFrames[0]?.t ?? 0;
  const t1 = closeFrames[0]?.t ?? 0;
  await sheet(
    'mobile-menu',
    [
      ...pick(openFrames, 6).map((f) => ({ ...f, label: `open +${Math.round(f.t - t0)} ms` })),
      ...pick(closeFrames, 4).map((f) => ({ ...f, label: `Esc +${Math.round(f.t - t1)} ms` })),
    ],
    5,
    220,
  );
  // Link in the sheet closes it and scrolls to the section.
  await page.tap('.menu-toggle');
  await page.waitForTimeout(900);
  await page.tap('.sheet-links a[href="#faq"]');
  await page.waitForTimeout(2000);
  const nav = await page.evaluate(() => ({
    dialogOpen: document.querySelector('#mobile-menu').open,
    faqTop: Math.round(document.querySelector('#faq').getBoundingClientRect().top),
    hash: location.hash,
  }));
  results['mobile-menu'] = { afterOpen: state, tabCycle: tabbed, afterEsc: afterClose, sheetLinkToFaq: nav };
  await page.context().close();
}

// 6. Theme toggle (View Transition circular reveal) and FAQ accordion.
{
  const page = await newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.mouse.wheel(0, 1);
  await appReady(page);
  await page.waitForTimeout(1500);
  const frames = await screencast(page, () => page.click('.nav .theme-toggle'), 1000);
  const t0 = frames[0]?.t ?? 0;
  await sheet('theme-toggle', pick(frames, 8).map((f) => ({ ...f, label: `t = ${Math.round(f.t - t0)} ms` })), 4, 400);
  const theme = await page.evaluate(() => ({ dataTheme: document.documentElement.dataset.theme, stored: localStorage.getItem('dl-theme'), label: document.querySelector('.nav .theme-toggle').getAttribute('aria-label') }));
  await page.reload({ waitUntil: 'networkidle' });
  const persisted = await page.evaluate(() => document.documentElement.dataset.theme);

  await page.evaluate(() => document.querySelector('#faq-forgot').scrollIntoView({ block: 'center' }));
  await page.mouse.wheel(0, 1);
  await appReady(page);
  await page.waitForTimeout(1500);
  const faqFrames = await screencast(page, () => page.click('#faq-forgot summary'), 800);
  const faqOpen = await page.evaluate(() => document.querySelector('#faq-forgot').open);
  await page.click('#faq-forgot summary');
  await page.waitForTimeout(800);
  const faqClosed = !(await page.evaluate(() => document.querySelector('#faq-forgot').open));
  const f0 = faqFrames[0]?.t ?? 0;
  await sheet('faq-accordion', pick(faqFrames, 8).map((f) => ({ ...f, label: `t = ${Math.round(f.t - f0)} ms` })), 4, 400);
  results['theme-and-faq'] = { afterToggle: theme, persistedAfterReload: persisted, faqOpened: faqOpen, faqClosedAgain: faqClosed };
  await page.context().close();
}

await browser.close();
await close();
results.consoleErrors = errors;
writeFileSync(`${root}results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
