import { normalizeSettings } from '../core/settings.js';

/** @typedef {import('../core/settings.js').Settings} Settings */

// Synced storage: the choice follows the user to their other browsers.
const AREA = 'sync';
const KEY = 'settings';

/** @returns {Promise<Settings>} */
export async function loadSettings() {
  const stored = await chrome.storage[AREA].get(KEY);
  return normalizeSettings(stored[KEY]);
}

/**
 * @param {Settings} settings
 * @returns {Promise<void>}
 */
export function saveSettings(settings) {
  return chrome.storage[AREA].set({ [KEY]: settings });
}

/** @param {(settings: Settings) => void} listener */
export function onSettingsChanged(listener) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === AREA && KEY in changes) listener(normalizeSettings(changes[KEY].newValue));
  });
}
