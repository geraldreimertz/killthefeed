/**
 * One selector that matches whatever any of `selectors` matches.
 *
 * `:is()` reads its arguments forgivingly: a selector the browser does not
 * understand switches only itself off, never its neighbours.
 *
 * @param {string[]} selectors
 */
export function anyOf(selectors) {
  return `:is(${selectors.join(', ')})`;
}
