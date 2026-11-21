import { sites } from '../../filters/index.js';
import { isSiteSwitchedOn, withEnabled, withSiteSwitched } from '../core/settings.js';
import { loadSettings, onSettingsChanged, saveSettings } from '../platform/storage.js';

/** @typedef {import('../core/settings.js').Settings} Settings */

const master = document.querySelector('#master');
const summary = document.querySelector('#summary');
const list = document.querySelector('#sites');
const rowTemplate = document.querySelector('#site-row');

/** @type {Settings} */
let settings;

const rows = sites.map(addRow);

master.addEventListener('change', () => change(withEnabled(settings, master.checked)));
onSettingsChanged(render);
loadSettings().then(render);

function addRow(site) {
  const row = rowTemplate.content.cloneNode(true);
  const toggle = row.querySelector('.switch');
  const state = row.querySelector('.site__state');

  row.querySelector('.site__name').textContent = site.name;
  toggle.addEventListener('change', () =>
    change(withSiteSwitched(settings, site.id, toggle.checked)),
  );
  list.append(row);

  return { site, toggle, state };
}

/** Shows the change at once and takes it back if it cannot be saved. */
function change(next) {
  const previous = settings;
  render(next);
  saveSettings(next).catch(() => render(previous));
}

/** @param {Settings} next */
function render(next) {
  settings = next;
  document.body.classList.toggle('is-hiding', settings.enabled);
  master.checked = settings.enabled;
  summary.textContent = summarize(settings);

  for (const { site, toggle, state } of rows) {
    const on = isSiteSwitchedOn(settings, site.id);
    toggle.checked = on;
    toggle.disabled = !settings.enabled;
    state.textContent = settings.enabled && on ? 'Feed hidden' : 'Feed visible';
  }
}

/** @param {Settings} current */
function summarize(current) {
  if (!current.enabled) return 'Paused. Feeds are visible everywhere.';

  const hidden = sites.filter((site) => isSiteSwitchedOn(current, site.id)).length;
  const total = `${sites.length} ${sites.length === 1 ? 'site' : 'sites'}`;

  if (hidden === 0) return 'Every site is switched off.';
  return hidden === sites.length
    ? `Feeds are hidden on ${total}.`
    : `Feeds are hidden on ${hidden} of ${total}.`;
}
