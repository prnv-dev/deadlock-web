// Real Lighthouse runs (mobile + desktop) against the production build.
//   npm run build && npm run lighthouse
// One discarded warm-up run (a fresh headless Chrome sometimes delays its very
// first paint by ~0.8 s regardless of the page), then 3 runs per profile.
// The median run (by LCP) is saved to shots/lighthouse/{mobile,desktop}.{html,json};
// every run is listed in summary.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { serveDist } from './serve.mjs';

const RUNS = 3;
const out = fileURLToPath(new URL('../shots/lighthouse/', import.meta.url));
mkdirSync(out, { recursive: true });

const { url, close } = await serveDist(4190);
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-first-run'] });
await lighthouse(url, { port: chrome.port, logLevel: 'error', onlyCategories: ['performance'] });

const summary = [];
for (const [name, config] of [['mobile', undefined], ['desktop', desktopConfig]]) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const result = await lighthouse(url, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, config);
    const lhr = result.lhr;
    const s = (k) => Math.round(lhr.categories[k].score * 100);
    const n = (k) => lhr.audits[k].numericValue;
    runs.push({
      result,
      row: {
        profile: name,
        run: i + 1,
        performance: s('performance'),
        accessibility: s('accessibility'),
        'best-practices': s('best-practices'),
        seo: s('seo'),
        'FCP ms': Math.round(n('first-contentful-paint')),
        'LCP ms': Math.round(n('largest-contentful-paint')),
        'TBT ms': Math.round(n('total-blocking-time')),
        CLS: +n('cumulative-layout-shift').toFixed(3),
        'SI ms': Math.round(n('speed-index')),
      },
    });
  }
  runs.sort((a, b) => a.row['LCP ms'] - b.row['LCP ms']);
  const median = runs[Math.floor(RUNS / 2)];
  const [html, json] = median.result.report;
  writeFileSync(`${out}${name}.html`, html);
  writeFileSync(`${out}${name}.json`, json);
  summary.push(...runs.map((r) => ({ ...r.row, median: r === median })));

  const lhr = median.result.lhr;
  for (const cat of ['performance', 'accessibility', 'best-practices', 'seo']) {
    for (const ref of lhr.categories[cat].auditRefs) {
      const audit = lhr.audits[ref.id];
      if (ref.weight > 0 && audit.score !== null && audit.score < 1)
        console.log(`  [${name}] ${cat}: ${audit.id} (${audit.score}) ${audit.displayValue ?? ''}`);
    }
  }
}

chrome.kill();
await close();
console.table(summary);
writeFileSync(`${out}summary.json`, JSON.stringify(summary, null, 2));
