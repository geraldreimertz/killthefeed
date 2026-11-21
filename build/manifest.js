import { PRODUCT_NAME } from '../src/core/product.js';
import { matchPatterns } from '../src/core/sites.js';

/** @typedef {import('../src/core/filter-schema.js').Site} Site */

// Where things live inside the built extension.
export const CONTENT_SCRIPT = 'content.js';
export const POPUP_PAGE = 'popup/popup.html';
export const ICON_SIZES = [16, 32, 48, 128];

/** @param {number} size */
export const iconPath = (size) => `icons/icon-${size}.png`;

/** @param {Site} site */
export const stylesheetPath = (site) => `filters/${site.id}.css`;

/**
 * The extension manifest. Which pages the extension may touch follows from
 * the filter lists and from nothing else.
 *
 * @param {{ version: string, description: string, sites: Site[] }} options
 */
export function createManifest({ version, description, sites }) {
  const icons = Object.fromEntries(ICON_SIZES.map((size) => [size, iconPath(size)]));

  return {
    manifest_version: 3,
    name: PRODUCT_NAME,
    version,
    description,
    minimum_chrome_version: '105',
    icons,
    action: {
      default_title: PRODUCT_NAME,
      default_popup: POPUP_PAGE,
      default_icon: icons,
    },
    permissions: ['storage'],
    content_scripts: sites.map((site) => ({
      matches: matchPatterns(site),
      css: [stylesheetPath(site)],
      js: [CONTENT_SCRIPT],
      run_at: 'document_start',
    })),
  };
}
