import { anyOf } from '../core/selectors.js';

/** @typedef {import('../core/filter-schema.js').Rule} Rule */

/**
 * A feed as it was found on the page: its container and what was in it.
 *
 * @typedef {{ container: Element, content: Element[] }} Feed
 */

/**
 * Keeps a rule in force after the address has moved on, for as long as the
 * feed it was hiding is still on the page.
 *
 * Single-page apps change the address first and the content later. Sometimes
 * they never change the content at all, because the new "page" is a dialog on
 * top of the old one, such as the box for writing a post. A rule that follows
 * the address alone would let the feed show through in both cases.
 *
 * @param {() => void} onRelease Called when a held rule lets go by itself.
 */
export function createFeedHold(onRelease) {
  /** @type {Map<Rule, { selector: string, feeds: Feed[] }>} */
  const held = new Map();

  const pageChanges = new MutationObserver(() => {
    if (dropVanishedFeeds()) onRelease();
  });

  function dropVanishedFeeds() {
    const before = held.size;
    for (const [rule, { selector, feeds }] of held) {
      if (!feeds.some((feed) => isStillThere(feed, selector))) held.delete(rule);
    }
    watchWhileHolding();
    return held.size < before;
  }

  function watchWhileHolding() {
    if (held.size === 0) {
      pageChanges.disconnect();
    } else {
      pageChanges.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributeFilter: ['hidden'],
      });
    }
  }

  return {
    /**
     * Holds on to `rule` if one of its feeds is on the page right now.
     *
     * @param {Rule} rule
     */
    take(rule) {
      if (!rule.replace?.length) return;
      const selector = anyOf(rule.replace);
      const feeds = [...document.querySelectorAll(selector)]
        .map((container) => ({ container, content: [...container.children] }))
        .filter((feed) => isStillThere(feed, selector));
      if (feeds.length > 0) {
        held.set(rule, { selector, feeds });
        watchWhileHolding();
      }
    },

    /** @param {Rule} rule */
    release(rule) {
      held.delete(rule);
      watchWhileHolding();
    },

    clear() {
      held.clear();
      watchWhileHolding();
    },

    /** @returns {Rule[]} */
    rules() {
      return [...held.keys()];
    },
  };
}

/**
 * A feed is gone once its container
 * - has left the page,
 * - is no longer shown: apps keep old pages in the document, hidden,
 * - has turned into something else, or
 * - has been refilled: apps reuse a container for the next page's content,
 *   and that content was never meant to be hidden.
 *
 * @param {Feed} feed
 * @param {string} selector
 */
function isStillThere({ container, content }, selector) {
  const sameContainer = container.isConnected && container.matches(selector);
  const sameContent =
    content.length === 0 || content.some((child) => child.parentElement === container);
  return sameContainer && sameContent && container.checkVisibility();
}
