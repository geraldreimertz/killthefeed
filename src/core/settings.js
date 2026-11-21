/**
 * @typedef {object} Settings
 * @property {boolean} enabled          The main switch.
 * @property {string[]} disabledSites   Ids of the sites the user switched off.
 */

// Sites are stored by what is switched off, so a site added in a later
// version starts out switched on.

/** @type {Readonly<Settings>} */
export const DEFAULT_SETTINGS = Object.freeze({ enabled: true, disabledSites: [] });

/**
 * Stored data may be missing, old or damaged. This always returns usable settings.
 *
 * @param {unknown} stored
 * @returns {Settings}
 */
export function normalizeSettings(stored) {
  const { enabled, disabledSites } = /** @type {Partial<Settings>} */ (stored ?? {});
  return {
    enabled: typeof enabled === 'boolean' ? enabled : DEFAULT_SETTINGS.enabled,
    disabledSites: Array.isArray(disabledSites)
      ? disabledSites.filter((id) => typeof id === 'string')
      : [],
  };
}

/**
 * The position of a site's own switch, whatever the main switch says.
 *
 * @param {Settings} settings
 * @param {string} siteId
 */
export function isSiteSwitchedOn(settings, siteId) {
  return !settings.disabledSites.includes(siteId);
}

/**
 * Whether feeds on this site are to be hidden right now.
 *
 * @param {Settings} settings
 * @param {string} siteId
 */
export function isBlocking(settings, siteId) {
  return settings.enabled && isSiteSwitchedOn(settings, siteId);
}

/**
 * @param {Settings} settings
 * @param {boolean} enabled
 * @returns {Settings}
 */
export function withEnabled(settings, enabled) {
  return { ...settings, enabled };
}

/**
 * @param {Settings} settings
 * @param {string} siteId
 * @param {boolean} on
 * @returns {Settings}
 */
export function withSiteSwitched(settings, siteId, on) {
  const others = settings.disabledSites.filter((id) => id !== siteId);
  return { ...settings, disabledSites: on ? others : [...others, siteId] };
}
