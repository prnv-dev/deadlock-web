// Computes size-adjust / ascent / descent overrides for the "Jakarta Fallback"
// @font-face (Arial-based) so the swap to Plus Jakarta Sans does not reflow text.
//   node scripts/font-metrics.mjs
import { chromium } from 'playwright';
import { serveDist } from './serve.mjs';

const { url, close } = await serveDist(4184);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
const res = await page.evaluate(async () => {
  await document.fonts.ready;
  const sample = 'Deadlock is a local-first encrypted vault for Windows. Add files, they are stored encrypted on your own PC. No account, no cloud sync. 0123456789';
  const c = document.createElement('canvas').getContext('2d');
  const out = {};
  for (const w of [400, 800]) {
    c.font = `${w} 100px "Plus Jakarta Sans"`;
    const j = c.measureText(sample);
    c.font = `${w === 800 ? 'bold' : 'normal'} 100px Arial`;
    const a = c.measureText(sample);
    const size = j.width / a.width;
    out[w] = {
      sizeAdjust: +(size * 100).toFixed(1),
      ascent: +((j.fontBoundingBoxAscent / size)).toFixed(1),
      descent: +((j.fontBoundingBoxDescent / size)).toFixed(1),
    };
  }
  return out;
});
console.log(JSON.stringify(res, null, 2));
await browser.close();
await close();
