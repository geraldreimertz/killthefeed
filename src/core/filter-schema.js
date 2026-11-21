import { isPathPattern } from './paths.js';
import { coversHostname } from './sites.js';

/**
 * @typedef {object} Rule
 * @property {string} id            Unique within its site. Lowercase letters, digits, dashes.
 * @property {string} description   What the rule takes away, in plain words.
 * @property {string[]} paths       Path patterns of the pages the rule applies to.
 * @property {string[]} [replace]   Feed containers. Their content goes, a short note takes its place.
 * @property {string[]} [keep]      Direct children of a replaced container that stay visible.
 * @property {string[]} [hide]      Elements that simply disappear.
 * @property {string} [notes]       Anything the next maintainer should know.
 */

/**
 * @typedef {object} Site
 * @property {string} id            Lowercase letters, digits, dashes.
 * @property {string} name          How people call the site.
 * @property {string[]} domains     Plain domains. Subdomains are included.
 * @property {Rule[]} rules
 */

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
const SITE_KEYS = ['id', 'name', 'domains', 'rules'];
const RULE_KEYS = ['id', 'description', 'notes', 'paths', 'replace', 'keep', 'hide'];
const SELECTOR_KEYS = ['replace', 'keep', 'hide'];

/**
 * Checks filter lists before they are trusted anywhere else.
 *
 * @param {unknown[]} sites
 * @returns {string[]} One sentence per problem. Empty when the lists are fine.
 */
export function validateSites(sites) {
  return [...sites.flatMap(validateSite), ...findClashes(sites)];
}

function validateSite(site) {
  if (!isRecord(site)) return ['A site must be an object.'];

  const problems = [];
  const report = (message) => problems.push(`Site "${site.id}": ${message}`);

  if (!isId(site.id)) report('"id" needs lowercase letters, digits and single dashes.');
  if (!isText(site.name)) report('"name" is missing.');
  if (!isFilledList(site.domains) || !site.domains.every(isDomain)) {
    report('"domains" needs at least one plain domain such as "example.com".');
  }
  if (!isFilledList(site.rules)) report('"rules" needs at least one rule.');
  unknownKeys(site, SITE_KEYS).forEach((key) => report(`"${key}" is not a known key.`));

  const rules = listOf(site.rules);
  rules.forEach((rule) => validateRule(rule).forEach(report));
  duplicates(rules.map((rule) => rule?.id)).forEach((id) =>
    report(`rule id "${id}" is used twice.`),
  );

  return problems;
}

function validateRule(rule) {
  if (!isRecord(rule)) return ['a rule must be an object.'];

  const problems = [];
  const report = (message) => problems.push(`rule "${rule.id}": ${message}`);

  if (!isId(rule.id)) report('"id" needs lowercase letters, digits and single dashes.');
  if (!isText(rule.description)) report('"description" is missing.');
  if ('notes' in rule && !isText(rule.notes)) report('"notes" must be text.');
  if (!isFilledList(rule.paths)) report('"paths" needs at least one path pattern.');
  listOf(rule.paths)
    .filter((pattern) => !isPathPattern(pattern))
    .forEach((pattern) => report(`"${pattern}" is not a path pattern.`));

  for (const key of SELECTOR_KEYS) {
    if (key in rule && !Array.isArray(rule[key])) report(`"${key}" must be a list of selectors.`);
    listOf(rule[key])
      .filter((selector) => !isSelector(selector))
      .forEach((selector) => report(`"${key}" contains "${selector}", which is not a usable selector.`));
  }
  if (listOf(rule.replace).length + listOf(rule.hide).length === 0) {
    report('needs at least one selector in "replace" or "hide".');
  }
  if (listOf(rule.keep).length > 0 && listOf(rule.replace).length === 0) {
    report('"keep" only makes sense together with "replace".');
  }
  unknownKeys(rule, RULE_KEYS).forEach((key) => report(`"${key}" is not a known key.`));

  return problems;
}

/** Ids and domains must point to exactly one site. */
function findClashes(sites) {
  const records = sites.filter(isRecord);
  const problems = duplicates(records.map((site) => site.id)).map(
    (id) => `Site id "${id}" is used twice.`,
  );

  const claims = records.flatMap((site) =>
    listOf(site.domains).filter(isDomain).map((domain) => ({ site, domain })),
  );
  claims.forEach((claim, index) => {
    for (const other of claims.slice(index + 1)) {
      const overlap =
        coversHostname(claim.domain, other.domain) || coversHostname(other.domain, claim.domain);
      if (overlap && other.site !== claim.site) {
        problems.push(
          `Sites "${claim.site.id}" and "${other.site.id}" both claim "${other.domain}".`,
        );
      }
    }
  });

  return problems;
}

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isId = (value) => typeof value === 'string' && ID.test(value);
const isDomain = (value) => typeof value === 'string' && DOMAIN.test(value);
const isFilledList = (value) => Array.isArray(value) && value.length > 0;
const listOf = (value) => (Array.isArray(value) ? value : []);

/**
 * Selectors end up inside a stylesheet. Without braces they cannot break out
 * of the selector they are written into, so a list can hide things but never
 * add styles of its own.
 */
const isSelector = (value) => isText(value) && !/[{}]/.test(value);

const unknownKeys = (record, known) => Object.keys(record).filter((key) => !known.includes(key));

/** Ids that occur more than once. Values that are no ids at all are reported elsewhere. */
const duplicates = (values) => [
  ...new Set(values.filter((value, index) => isId(value) && values.indexOf(value) !== index)),
];
