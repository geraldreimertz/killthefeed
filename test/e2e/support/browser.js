import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { launchWithExtension } from '../../../build/extension-browser.js';

const fixtureFolder = fileURLToPath(new URL('../fixtures', import.meta.url));

/** Which stand-in page answers for which site. No test ever reaches the real sites. */
const STAND_INS = {
  'www.instagram.com': 'instagram.html',
  'www.reddit.com': 'reddit.html',
  'www.linkedin.com': 'linkedin.html',
  'x.com': 'x.html',
  'www.youtube.com': 'youtube.html',
};

/**
 * Starts a browser with the built extension installed, in which the supported
 * sites are played by stand-in pages.
 *
 * `webRequests` lists every request the browser tried to send to the web
 * while the tests ran, whoever asked for it.
 */
export async function launchWithStandIns() {
  const browser = await launchWithExtension();
  /** @type {{ url: string, type: string }[]} */
  const webRequests = [];

  // Web requests only: the extension's own pages must load from the extension.
  await browser.context.route(/^https?:/, async (route) => {
    const request = route.request();
    webRequests.push({ url: request.url(), type: request.resourceType() });

    const standIn = STAND_INS[new URL(request.url()).hostname];
    if (!standIn) return route.abort();
    return route.fulfill({
      contentType: 'text/html',
      body: await readFile(path.join(fixtureFolder, standIn), 'utf8'),
    });
  });

  return { ...browser, webRequests };
}
