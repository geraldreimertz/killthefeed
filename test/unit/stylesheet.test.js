import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findCssProblems } from '../../build/stylesheet-check.js';
import { sites } from '../../filters/index.js';
import { STATE_ATTRIBUTE } from '../../src/core/state-attribute.js';
import { compileStylesheet } from '../../src/core/stylesheet.js';

const site = (rule) => ({
  id: 'forum',
  name: 'Forum',
  domains: ['forum.example'],
  rules: [{ id: 'feed', description: 'Start page', paths: ['/'], ...rule }],
});

/** The selectors of all blocks in a stylesheet, in order. */
const selectorsOf = (css) => [...css.matchAll(/^(.+) \{$/gm)].map((match) => match[1]);

test('nothing applies unless the rule is named on <html>', () => {
  const css = compileStylesheet(site({ replace: ['.feed'], hide: ['.badge'] }));
  const scope = `html[${STATE_ATTRIBUTE}~="feed"] `;

  assert.ok(selectorsOf(css).length > 0);
  for (const selector of selectorsOf(css)) {
    assert.ok(selector.startsWith(scope), selector);
  }
});

test('hidden elements are removed from the layout', () => {
  const css = compileStylesheet(site({ hide: ['.badge', '.counter'] }));

  assert.deepEqual(selectorsOf(css), [`html[${STATE_ATTRIBUTE}~="feed"] :is(.badge, .counter)`]);
  assert.match(css, /display: none !important;/);
});

test('a replaced container parks all of its children and shows a note', () => {
  const css = compileStylesheet(site({ replace: ['.feed'] }));
  const container = `html[${STATE_ATTRIBUTE}~="feed"] :is(.feed)`;

  assert.deepEqual(selectorsOf(css), [
    container,
    `${container} > *`,
    `${container}::before`,
    `${container}::after`,
  ]);
  assert.match(css, /visibility: hidden !important;/);
  assert.match(css, /content: "Feed killed\." !important;/);
});

test('replaced content keeps its size instead of being removed', () => {
  // `display: none` would make feeds believe their end was reached and reload forever.
  const css = compileStylesheet(site({ replace: ['.feed'] }));

  assert.doesNotMatch(css, /display: none/);
  assert.match(css, /overflow: clip !important;/);
});

test('parked children are given a box, so boxless wrappers can be moved too', () => {
  const css = compileStylesheet(site({ replace: ['.feed'] }));
  const parked = css.split('\n\n').find((part) => part.includes(':is(.feed) > * {'));

  assert.match(parked, /display: block !important;/);
  assert.match(parked, /position: absolute !important;/);
});

test('parked children cannot be focused, clicked or searched', () => {
  const css = compileStylesheet(site({ replace: ['.feed'] }));

  assert.match(css, /interactivity: inert !important;/);
  assert.match(css, /pointer-events: none !important;/);
});

test('the note brings its own colour instead of trusting the page', () => {
  // Many pages give their containers no text colour, so there is nothing to inherit.
  const css = compileStylesheet(site({ replace: ['.feed'] }));
  const notes = css.split('\n\n').filter((part) => /::(before|after) \{/.test(part));

  assert.equal(notes.length, 2);
  for (const note of notes) {
    assert.match(note, /color: #767676 !important;/);
  }
});

test('kept children are not parked', () => {
  const css = compileStylesheet(site({ replace: ['.feed'], keep: ['.composer', ':first-child'] }));

  assert.ok(
    selectorsOf(css).includes(
      `html[${STATE_ATTRIBUTE}~="feed"] :is(.feed) > :not(:is(.composer, :first-child))`,
    ),
  );
});

test('every declaration is marked important', () => {
  const css = compileStylesheet(site({ replace: ['.feed'], hide: ['.badge'] }));
  const declarations = css.split('\n').filter((line) => line.startsWith('  '));

  assert.ok(declarations.length > 0);
  for (const declaration of declarations) {
    assert.match(declaration, / !important;$/);
  }
});

test('each rule gets its own scope', () => {
  const twoRules = site({ replace: ['.feed'] });
  twoRules.rules.push({ id: 'badges', description: 'Counters', paths: ['/**'], hide: ['.badge'] });

  assert.ok(compileStylesheet(twoRules).includes(`html[${STATE_ATTRIBUTE}~="badges"] :is(.badge)`));
});

for (const registered of sites) {
  test(`the stylesheet for ${registered.name} is valid CSS`, async () => {
    assert.deepEqual(await findCssProblems(compileStylesheet(registered)), []);
  });
}

test('a selector with a stray bracket is caught by the CSS check', async () => {
  const css = compileStylesheet(site({ hide: ['.badge)'] }));
  assert.notDeepEqual(await findCssProblems(css), []);
});
