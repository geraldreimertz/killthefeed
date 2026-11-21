// Renders assets/icon.svg into the PNG sizes the browser asks for.
// Run it after changing the drawing:  npm run icons

import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { ICON_SIZES, iconPath } from './manifest.js';

const assets = fileURLToPath(new URL('../assets', import.meta.url));
const drawing = await readFile(path.join(assets, 'icon.svg'), 'utf8');

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(
    `<style>html, body { margin: 0; background: transparent; } svg { display: block; width: 100vw; height: 100vh; }</style>${drawing}`,
  );
  for (const size of ICON_SIZES) {
    const file = path.join(assets, iconPath(size));
    await mkdir(path.dirname(file), { recursive: true });
    await page.setViewportSize({ width: size, height: size });
    await page.screenshot({ path: file, omitBackground: true });
  }
} finally {
  await browser.close();
}

console.log(`Rendered ${ICON_SIZES.length} icons into assets/${path.dirname(iconPath(0))}/`);
