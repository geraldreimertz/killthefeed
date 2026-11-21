import { PRODUCT_NAME } from './product.js';
import { anyOf } from './selectors.js';
import { STATE_ATTRIBUTE } from './state-attribute.js';

/** @typedef {import('./filter-schema.js').Site} Site */
/** @typedef {import('./filter-schema.js').Rule} Rule */

const PLACEHOLDER = {
  title: 'Feed killed.',
  hint: `Hidden by ${PRODUCT_NAME}. Go do what you came here for.`,
};

const TYPEFACE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

// The note cannot know the page's colours, and many pages give their
// containers no text colour to inherit. This is the one gray that reads
// equally well on white and on black: 4.6 to 1 either way.
const INK = '#757575';

/**
 * Turns a site's rules into the stylesheet that enforces them.
 *
 * @param {Site} site A site that passed validation.
 * @returns {string}
 */
export function compileStylesheet(site) {
  return `${site.rules.flatMap(compileRule).join('\n\n')}\n`;
}

/** @param {Rule} rule */
function compileRule(rule) {
  const whenActive = `html[${STATE_ATTRIBUTE}~="${rule.id}"]`;
  const blocks = [];

  if (rule.hide?.length) {
    blocks.push(block(`${whenActive} ${anyOf(rule.hide)}`, { display: 'none' }));
  }
  if (rule.replace?.length) {
    blocks.push(...replacement(`${whenActive} ${anyOf(rule.replace)}`, rule.keep ?? []));
  }
  return blocks;
}

/**
 * A replaced feed is parked, not removed: its content keeps its size and sits
 * one screen below the container's edge, clipped away and invisible.
 *
 * Feeds reload themselves by watching their own layout. Remove the content
 * (`display: none`) and many of them conclude that the reader has reached the
 * end, so they fetch the next page, and the next. Parked content looks to the
 * site like a feed nobody has scrolled yet, which keeps it quiet.
 */
function replacement(container, keep) {
  const parked = keep.length ? `${container} > :not(${anyOf(keep)})` : `${container} > *`;

  return [
    block(container, {
      position: 'relative',
      display: 'flex',
      'flex-direction': 'column',
      overflow: 'clip',
    }),
    block(parked, {
      // Only a box can be moved. Some sites wrap their posts in boxless
      // `display: contents` elements, which would stay where they are.
      display: 'block',
      position: 'absolute',
      inset: 'calc(100% + 100vh) 0 auto',
      visibility: 'hidden',
      // A page can declare parts of its feed visible again. Clipped, they
      // still cannot be seen; inert, they cannot be reached by keyboard,
      // pointer or the browser's search either.
      'pointer-events': 'none',
      interactivity: 'inert',
    }),
    // The note follows whatever the rule keeps: kept children have order 0.
    block(`${container}::before`, {
      ...note(PLACEHOLDER.title, 1),
      padding: '56px 24px 4px',
      font: `700 20px/1.3 ${TYPEFACE}`,
    }),
    block(`${container}::after`, {
      ...note(PLACEHOLDER.hint, 2),
      padding: '0 24px 56px',
      font: `400 14px/1.5 ${TYPEFACE}`,
    }),
  ];
}

function note(text, order) {
  return {
    content: cssString(text),
    order: String(order),
    position: 'static',
    display: 'block',
    color: INK,
    'text-align': 'center',
  };
}

/** Every declaration is `!important`: the page's own styles must not win. */
function block(selector, declarations) {
  const lines = Object.entries(declarations).map(
    ([property, value]) => `  ${property}: ${value} !important;`,
  );
  return `${selector} {\n${lines.join('\n')}\n}`;
}

function cssString(text) {
  return `"${text.replace(/["\\]/g, '\\$&')}"`;
}
