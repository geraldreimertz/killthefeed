import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateSites } from '../../src/core/filter-schema.js';

const validRule = () => ({
  id: 'feed',
  description: 'Start page',
  paths: ['/', '/popular/**'],
  replace: ['.feed'],
});

const validSite = () => ({
  id: 'forum',
  name: 'Forum',
  domains: ['forum.example'],
  rules: [validRule()],
});

/** The problems reported for a valid site after `change` was applied to it. */
function problemsAfter(change) {
  const site = validSite();
  change(site, site.rules[0]);
  return validateSites([site]);
}

test('a complete site has no problems', () => {
  assert.deepEqual(validateSites([validSite()]), []);
});

test('optional keys are accepted', () => {
  const problems = problemsAfter((site, rule) => {
    rule.keep = [':first-child'];
    rule.hide = ['.badge'];
    rule.notes = 'Checked against the live site.';
  });
  assert.deepEqual(problems, []);
});

const mistakes = {
  'an id with capitals': (site) => (site.id = 'Forum'),
  'a missing name': (site) => delete site.name,
  'no domains': (site) => (site.domains = []),
  'a domain with a scheme': (site) => (site.domains = ['https://forum.example']),
  'a domain with a wildcard': (site) => (site.domains = ['*.forum.example']),
  'no rules': (site) => (site.rules = []),
  'a misspelled site key': (site) => (site.domain = ['forum.example']),
  'a rule that is not an object': (site) => (site.rules = ['feed']),
  'a rule id with spaces': (site, rule) => (rule.id = 'the feed'),
  'a missing description': (site, rule) => delete rule.description,
  'no paths': (site, rule) => (rule.paths = []),
  'a path without a leading slash': (site, rule) => (rule.paths = ['feed']),
  'a rule without selectors': (site, rule) => delete rule.replace,
  'selectors that are not a list': (site, rule) => (rule.hide = '.badge'),
  'an empty selector': (site, rule) => (rule.hide = ['  ']),
  'a selector that smuggles in styles': (site, rule) =>
    (rule.hide = ['a{} body{background:url(https://tracker.example)}']),
  'keep without replace': (site, rule) => {
    delete rule.replace;
    rule.hide = ['.badge'];
    rule.keep = [':first-child'];
  },
  'a misspelled rule key': (site, rule) => (rule.path = ['/']),
  'two rules with the same id': (site) => site.rules.push(validRule()),
};

for (const [mistake, make] of Object.entries(mistakes)) {
  test(`${mistake} is reported`, () => {
    const problems = problemsAfter(make);
    assert.ok(problems.length > 0);
    for (const problem of problems) {
      assert.match(problem, /^Site "/);
    }
  });
}

test('problems name the site and the rule they belong to', () => {
  const [problem] = problemsAfter((site, rule) => (rule.paths = ['feed']));
  assert.equal(problem, 'Site "forum": rule "feed": "feed" is not a path pattern.');
});

test('two sites cannot share an id', () => {
  const other = { ...validSite(), domains: ['other.example'] };
  assert.deepEqual(validateSites([validSite(), other]), ['Site id "forum" is used twice.']);
});

test('two sites cannot claim the same hostnames', () => {
  const sub = { ...validSite(), id: 'old-forum', domains: ['old.forum.example'] };
  assert.deepEqual(validateSites([validSite(), sub]), [
    'Sites "forum" and "old-forum" both claim "old.forum.example".',
  ]);
});

test('entries that are not sites are reported instead of crashing', () => {
  assert.deepEqual(validateSites([null, 'reddit']), [
    'A site must be an object.',
    'A site must be an object.',
  ]);
});
