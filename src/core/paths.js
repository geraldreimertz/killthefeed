// Path patterns decide on which pages of a site a rule applies.
//
//   /feed            this path only (a trailing slash makes no difference)
//   /r/*/wiki        "*" stands for exactly one path segment
//   /explore/**      this path and everything below it
//
// Upper and lower case are treated alike. Query string and hash are not part
// of a path and never take part in matching.

const ONE_SEGMENT = '*';
const ANY_DEPTH = '**';

/**
 * @param {unknown} pattern
 * @returns {boolean}
 */
export function isPathPattern(pattern) {
  if (typeof pattern !== 'string' || !pattern.startsWith('/') || /[\s?#]/.test(pattern)) {
    return false;
  }
  const segments = segmentsOf(pattern);
  return segments.every((segment, index) => {
    if (segment === ANY_DEPTH) return index === segments.length - 1;
    return segment !== '' && (segment === ONE_SEGMENT || !segment.includes('*'));
  });
}

/**
 * @param {string} pattern A valid path pattern.
 * @param {string} pathname For example `location.pathname`.
 * @returns {boolean}
 */
export function matchesPath(pattern, pathname) {
  return toRegExp(pattern).test(pathname);
}

function segmentsOf(pattern) {
  const path = pattern.replace(/\/$/, '');
  return path === '' ? [] : path.slice(1).split('/');
}

function toRegExp(pattern) {
  const segments = segmentsOf(pattern);
  const anyDepth = segments.at(-1) === ANY_DEPTH;
  const fixed = anyDepth ? segments.slice(0, -1) : segments;
  const prefix = fixed
    .map((segment) => `/${segment === ONE_SEGMENT ? '[^/]+' : escapeRegExp(segment)}`)
    .join('');
  return new RegExp(`^${prefix}${anyDepth ? '(?:/.*)?' : '/?'}$`, 'i');
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
