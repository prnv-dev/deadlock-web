// Shared helper: serve dist/ with `vite preview` for the verification scripts.
import { preview } from 'vite';

export async function serveDist(port = 4173) {
  const server = await preview({ preview: { port, strictPort: true, open: false }, logLevel: 'silent' });
  const url = `http://localhost:${port}/`;
  return { url, close: () => new Promise((r) => server.httpServer.close(r)) };
}

/** Scroll the whole page in steps so every once-only reveal has fired. */
export async function scrollThrough(page, step = 0.6, pause = 140) {
  await page.evaluate(
    async ({ step, pause }) => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const max = () => document.documentElement.scrollHeight - innerHeight;
      for (let y = 0; y < max(); y += innerHeight * step) {
        window.scrollTo(0, y);
        await wait(pause);
      }
      window.scrollTo(0, max());
      await wait(600);
    },
    { step, pause },
  );
}
