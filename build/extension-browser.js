import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { POPUP_PAGE } from './manifest.js';

const extensionFolder = fileURLToPath(new URL('../dist', import.meta.url));

/**
 * Starts a browser with the built extension installed, in a profile of its
 * own that is thrown away afterwards.
 *
 * @param {import('playwright').BrowserContextOptions} [options]
 * @returns {Promise<{ context: import('playwright').BrowserContext, popupUrl: string, close: () => Promise<void> }>}
 */
export async function launchWithExtension(options = {}) {
  const profile = await mkdtemp(path.join(tmpdir(), 'kill-the-feed-'));
  const context = await chromium.launchPersistentContext(profile, {
    ...options,
    channel: 'chromium',
    args: [`--disable-extensions-except=${extensionFolder}`, `--load-extension=${extensionFolder}`],
  });

  return {
    context,
    popupUrl: `chrome-extension://${extensionId(extensionFolder)}/${POPUP_PAGE}`,
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
