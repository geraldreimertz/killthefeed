import { STATE_ATTRIBUTE } from '../core/state-attribute.js';

/**
 * Tells the stylesheet which rules are in force on this page.
 *
 * @param {string[]} ruleIds
 */
export function showActiveRules(ruleIds) {
  const root = document.documentElement;
  const value = ruleIds.join(' ');

  if (value === '') {
    root.removeAttribute(STATE_ATTRIBUTE);
  } else if (root.getAttribute(STATE_ATTRIBUTE) !== value) {
    root.setAttribute(STATE_ATTRIBUTE, value);
  }
}
