import { matchesPath } from './paths.js';

/** @typedef {import('./filter-schema.js').Site} Site */
/** @typedef {import('./filter-schema.js').Rule} Rule */

/**
 * A site's domain stands for itself and all of its subdomains.
 *
 * @param {string} domain
 * @param {string} hostname
 */
export function coversHostname(domain, hostname) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/**
 * @param {Site[]} sites
 * @param {string} hostname
 * @returns {Site | undefined}
 */
export function findSite(sites, hostname) {
  return sites.find((site) => site.domains.some((domain) => coversHostname(domain, hostname)));
}

/**
 * The site's pages as browser match patterns, for the extension manifest.
 *
 * @param {Site} site
 * @returns {string[]}
 */
export function matchPatterns(site) {
  return site.domains.map((domain) => `https://*.${domain}/*`);
}

/**
 * @param {Site} site
 * @param {string} pathname
 * @returns {Rule[]} The rules that apply to this page.
 */
export function rulesForPath(site, pathname) {
  return site.rules.filter((rule) => rule.paths.some((pattern) => matchesPath(pattern, pathname)));
}
