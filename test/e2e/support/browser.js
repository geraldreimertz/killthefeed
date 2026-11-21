import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const extensionFolder = fileURLToPath(new URL('../../../dist', import.meta.url));
const fixtureFolder = fileURLToPath(new URL('../fixtures', import.meta.url));

/** Which stand-in page answers for which site. No test ever reaches the real sites. */
const STAND_INS = {
  'www.reddit.com': 'reddit.html',
  'www.linkedin.com': 'linkedin.html',
  'x.com': 'x.html',
  'www.youtube.com': 'youtube.html',
};

/**
 * Starts a browser with the built extension installed.
 *
 * @returns {Promise<{ context: import('playwright').BrowserContext, popupUrl: string, close: () => Promise<void> }>}
 */
export async function launchWithExtension() {
  const profile = await mkdtemp(path.join(tmpdir(), 'kill-the-feed-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    args: [`--disable-extensions-except=${extensionFolder}`, `--load-extension=${extensionFolder}`],
  });

  // Web requests only: the extension's own pages must load from the extension.
  await context.route(/^https?:/, async (route) => {
    const standIn = STAND_INS[new URL(route.request().url()).hostname];
    if (!standIn) return route.abort();
    return route.fulfill({
      contentType: 'text/html',
      body: await readFile(path.join(fixtureFolder, standIn), 'utf8'),
    });
  });

  return {
    context,
    popupUrl: `chrome-extension://${extensionId(extensionFolder)}/popup/popup.html`,
    async close() {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    },
  };
}

/**
 * The id the browser gives an unpacked extension: the first 32 hex digits of
 * the SHA-256 of its folder, written with the letters a to p.
 */
function extensionId(folder) {
  const digest = createHash('sha256').update(folder).digest('hex').slice(0, 32);
  return [...digest].map((digit) => String.fromCharCode(97 + parseInt(digit, 16))).join('');
}
