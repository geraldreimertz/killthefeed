/**
 * Runs `listener` whenever the address changes without a new page being
 * loaded: links inside single-page apps, back and forward.
 *
 * @param {() => void} listener
 */
export function onUrlChange(listener) {
  window.navigation.addEventListener('currententrychange', () => listener());
}

/**
 * Runs `listener` when the browser brings the page back from its back/forward
 * cache. A cached page is frozen and misses everything that happens meanwhile.
 *
 * @param {() => void} listener
 */
export function onRestoredFromCache(listener) {
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) listener();
  });
}
