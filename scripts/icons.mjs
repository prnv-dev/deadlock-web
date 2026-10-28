// Generates favicons, the apple-touch icon, manifest icons and the 1200x630
// Open Graph image into public/, all from the Deadlock icon-tile SVG.
//   npm run icons
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const pub = fileURLToPath(new URL('../public/', import.meta.url));
const nm = fileURLToPath(new URL('../node_modules/', import.meta.url));
mkdirSync(pub, { recursive: true });

const MARK = `<g transform="translate(512 512) scale(1.2) translate(-512 -512)"><rect x="683" y="352" width="136" height="320" rx="44" fill="#CDAB81"/><rect x="355" y="464" width="420" height="96" rx="48" fill="#FFFFFF"/><circle cx="355" cy="512" r="150" fill="#FFFFFF"/><circle cx="355" cy="486" r="38" fill="#A5661A"/><path d="M336 500 L374 500 L388 580 Q389 592 377 592 L333 592 Q321 592 322 580 Z" fill="#A5661A"/></g>`;
const TILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect x="32" y="32" width="960" height="960" rx="224" fill="#A5661A"/>${MARK}</svg>`;
// Full-bleed square for iOS, which applies its own corner mask.
const SQUARE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#A5661A"/>${MARK}</svg>`;

const png = (svg, size) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();

function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const o = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, o);
    header.writeUInt8(size >= 256 ? 0 : size, o + 1);
    header.writeUInt8(0, o + 2);
    header.writeUInt8(0, o + 3);
    header.writeUInt16LE(1, o + 4);
    header.writeUInt16LE(32, o + 6);
    header.writeUInt32LE(data.length, o + 8);
    header.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

writeFileSync(pub + 'favicon.svg', TILE + '\n');
const icoSizes = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(TILE, size) })));
writeFileSync(pub + 'favicon.ico', ico(icoSizes));
writeFileSync(pub + 'apple-touch-icon.png', await png(SQUARE, 180));
writeFileSync(pub + 'icon-192.png', await png(TILE, 192));
writeFileSync(pub + 'icon-512.png', await png(TILE, 512));
writeFileSync(
  pub + 'site.webmanifest',
  JSON.stringify(
    {
      name: 'Deadlock',
      short_name: 'Deadlock',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: '#F3EADF',
      background_color: '#F3EADF',
      display: 'browser',
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(pub + 'robots.txt', 'User-agent: *\nAllow: /\n');

// Open Graph image, rendered with the real brand fonts.
const font = (w) =>
  'data:font/woff2;base64,' +
  readFileSync(`${nm}@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${w}-normal.woff2`).toString('base64');
const BIG_MARK = `<svg class="mark" viewBox="150 280 740 464"><rect x="683" y="352" width="136" height="320" rx="44" fill="#CDAB81"/><rect x="355" y="464" width="420" height="96" rx="48" fill="#A5661A"/><circle cx="355" cy="512" r="150" fill="#A5661A"/><circle cx="355" cy="486" r="38" fill="#F3EADF"/><path d="M336 500 L374 500 L388 580 Q389 592 377 592 L333 592 Q321 592 322 580 Z" fill="#F3EADF"/></svg>`;
const html = `<!doctype html><html><head><style>
@font-face{font-family:J;font-weight:500;src:url(${font(500)})}
@font-face{font-family:J;font-weight:800;src:url(${font(800)})}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{position:relative;background:#F3EADF;font-family:J;color:#2B1D10}
.b{position:absolute;border-radius:50%}
.b1{width:900px;height:900px;left:-380px;top:-420px;background:radial-gradient(closest-side,rgba(246,196,160,.85),transparent)}
.b2{width:900px;height:900px;right:-360px;top:-200px;background:radial-gradient(closest-side,rgba(240,160,92,.45),transparent)}
.b3{width:800px;height:800px;left:260px;top:240px;background:radial-gradient(closest-side,rgba(252,236,210,1),transparent)}
.wrap{position:absolute;inset:0;padding:84px 92px;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;align-items:center;gap:22px;font-weight:800;font-size:44px;letter-spacing:-.02em}
.brand svg{width:96px;height:96px}
h1{margin:0;font-weight:800;font-size:80px;line-height:1.02;letter-spacing:-.04em;max-width:900px}
h1 em{font-style:normal;color:#6E4210}
p{margin:0;font-weight:500;font-size:28px;color:#6B5845;max-width:640px}
.mark{position:absolute;right:64px;top:250px;width:330px}
</style></head><body>
<div class="b b1"></div><div class="b b2"></div><div class="b b3"></div>${BIG_MARK}
<div class="wrap">
<div class="brand">${TILE.replace('<svg ', '<svg width="96" height="96" ')}Deadlock</div>
<div><h1>Your private files,<br>behind a <em>real lock.</em></h1></div>
<p>Free, local-first encrypted vault for Windows. No account, no cloud sync.</p>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const shot = await page.screenshot({ type: 'png' });
await browser.close();
writeFileSync(pub + 'og-image.png', await sharp(shot).png({ compressionLevel: 9, palette: false }).toBuffer());

console.log('Wrote favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png, og-image.png, site.webmanifest, robots.txt');
