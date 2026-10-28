import installer from './generated/installer.json' with { type: 'json' };

/**
 * Single source of truth for the installer, outbound links and static product facts.
 * These values are injected into index.html at dev/build time by the
 * `deadlock-html` plugin in vite.config.ts ({{download}}, {{source}}, ...).
 * Nothing here is fetched at runtime.
 */
export const INSTALLER = {
  /** Download path relative to the site root, derived from where the installer is in public/ */
  path: installer.path,
  /** Version string "0.1.0" */
  version: '0.1.0',
  filename: installer.filename,
  sizeMb: installer.sizeMb,
  sha256: installer.sha256,
} as const;

export const LINKS = {
  /** Every "Download" button points directly to the installer on this site. */
  download: INSTALLER.path,
  /** "View source on GitHub" and footer "GitHub". */
  source: 'https://github.com/prnv-dev/DeadLock',
  /** Footer "Report an issue". */
  issues: 'https://github.com/prnv-dev/DeadLock/issues',
} as const;

export const SITE = {
  /**
   * Public origin of the site, e.g. "https://deadlock.example". Leave empty
   * while unknown: canonical and og:url are then omitted and og:image stays
   * a relative path.
   */
  url: '',
  version: `v${INSTALLER.version}`,
  author: 'prnv-dev',
  year: '2026',
} as const;
