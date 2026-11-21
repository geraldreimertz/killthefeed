import { transform } from 'esbuild';

/**
 * Runs a compiled stylesheet through a real CSS parser. Catches what the
 * filter validation cannot see, such as a selector with a stray bracket.
 *
 * @param {string} css
 * @returns {Promise<string[]>} What the parser objects to. Empty when the stylesheet is fine.
 */
export async function findCssProblems(css) {
  const { warnings } = await transform(css, { loader: 'css', logLevel: 'silent' });
  return warnings.map((warning) => warning.text);
}
