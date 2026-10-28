import { defineConfig, type Plugin } from 'vite';
import { INSTALLER, LINKS, SITE } from './src/config.ts';

/** Replaces {{token}} placeholders in index.html with values from src/config.ts. */
function deadlockHtml(): Plugin {
  const url: string = SITE.url;
  const abs = (path: string) => (url ? url.replace(/\/$/, '') + path : path);
  const tokens: Record<string, string> = {
    download: LINKS.download,
    source: LINKS.source,
    issues: LINKS.issues,
    version: SITE.version,
    author: SITE.author,
    year: SITE.year,
    installerFilename: INSTALLER.filename,
    installerSizeMb: INSTALLER.sizeMb,
    installerSha256: INSTALLER.sha256,
    installerVersion: INSTALLER.version,
    ogImage: abs('/og-image.png'),
    // Only emitted when a public URL is configured.
    canonical: url
      ? `<link rel="canonical" href="${url}">\n    <meta property="og:url" content="${url}">`
      : '',
  };
  return {
    name: 'deadlock-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
          if (!(key in tokens)) throw new Error(`index.html: unknown placeholder {{${key}}}`);
          return tokens[key];
        });
      },
    },
  };
}

/**
 * Inlines the (single, ~8 KB gzipped) stylesheet into index.html at build
 * time. Saves one render-blocking round trip on slow mobile connections.
 */
function inlineCss(): Plugin {
  return {
    name: 'deadlock-inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = Object.values(bundle).find((f) => f.type === 'asset' && f.fileName === 'index.html');
      if (!html || html.type !== 'asset') return;
      let source = String(html.source);
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type !== 'asset' || !name.endsWith('.css')) continue;
        const tag = new RegExp(`<link rel="stylesheet"[^>]*href="\\./${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
        if (!tag.test(source)) continue;
        // url() paths are relative to assets/; re-base them for index.html.
        const css = String(file.source).replace(/url\(\.\//g, 'url(./assets/');
        source = source.replace(tag, () => `<style>${css}</style>`);
        delete bundle[name];
      }
      html.source = source;
    },
  };
}

export default defineConfig({
  // Relative asset URLs: the dist/ folder works from any host root or sub-path.
  base: './',
  plugins: [deadlockHtml(), inlineCss()],
  build: {
    target: 'es2020',
    modulePreload: { polyfill: false },
    reportCompressedSize: true,
  },
});
