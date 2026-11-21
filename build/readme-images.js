// Renders the pictures the README shows, into docs/.
//
//   npm run images     builds first, because the panel is photographed from the real extension

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

import { launchWithExtension } from './extension-browser.js';

const docs = fileURLToPath(new URL('../docs', import.meta.url));
const SHARP = { deviceScaleFactor: 2 };

/** Drawings: an HTML file in docs/src, photographed element by element. */
async function renderDrawings() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ ...SHARP, viewport: { width: 1280, height: 720 } });
    for (const [source, selector, picture] of [
      ['banner.html', '.banner', 'banner.png'],
      ['before-after.html', '.picture', 'before-after.png'],
    ]) {
      await page.goto(pathToFileURL(path.join(docs, 'src', source)).href);
      await page.locator(selector).screenshot({ path: path.join(docs, picture), omitBackground: true });
    }
  } finally {
    await browser.close();
  }
}

/** The panel behind the toolbar button, as the built extension shows it. */
async function photographPanel(colorScheme) {
  const browser = await launchWithExtension({
    ...SHARP,
    colorScheme,
    viewport: { width: 296, height: 480 },
  });
  try {
    const page = await browser.context.newPage();
    await page.goto(browser.popupUrl);
    // The panel is as tall as its content, so photograph the content, not the window.
    await page.locator('.is-settled').screenshot({ path: path.join(docs, `panel-${colorScheme}.png`) });
  } finally {
    await browser.close();
  }
}

await renderDrawings();
await photographPanel('light');
await photographPanel('dark');

console.log('Rendered the README pictures into docs/');
