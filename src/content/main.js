import { sites } from '../../filters/index.js';
import { DEFAULT_SETTINGS, isBlocking } from '../core/settings.js';
import { findSite, rulesForPath } from '../core/sites.js';
import { loadSettings, onSettingsChanged } from '../platform/storage.js';
import { createFeedHold } from './feed-hold.js';
import { onRestoredFromCache, onUrlChange } from './navigation.js';
import { showActiveRules } from './page-state.js';

const site = findSite(sites, location.hostname);
if (site) guard(site);

/**
 * Keeps the rules in force on this page in step with its address and with
 * what the user has switched on.
 *
 * @param {import('../core/filter-schema.js').Site} site
 */
function guard(site) {
  // Storage answers a moment after the page starts to render. Until then the
  // feed counts as unwanted: a note that disappears again beats a feed that
  // flashes up.
  let settings = DEFAULT_SETTINGS;
  let addressRules = [];
  const hold = createFeedHold(update);

  function update() {
    const blocking = isBlocking(settings, site.id);
    const matching = blocking ? rulesForPath(site, location.pathname) : [];
    const justLeft = addressRules.filter((rule) => !matching.includes(rule));
    addressRules = matching;

    if (blocking) {
      matching.forEach(hold.release);
      justLeft.forEach(hold.take);
    } else {
      hold.clear();
    }
    showActiveRules([...matching, ...hold.rules()].map((rule) => rule.id));
  }

  function applySettings(next) {
    settings = next;
    update();
  }

  function refreshSettings() {
    // Once the extension is updated or removed, this script stays behind on
    // open pages without access to storage. It carries on with what it knows.
    loadSettings().then(applySettings, () => {});
  }

  update();
  onUrlChange(update);
  onSettingsChanged(applySettings);
  onRestoredFromCache(refreshSettings);
  refreshSettings();
}
