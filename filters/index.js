import linkedin from './linkedin.json' with { type: 'json' };
import reddit from './reddit.json' with { type: 'json' };
import x from './x.json' with { type: 'json' };
import youtube from './youtube.json' with { type: 'json' };

/**
 * Every site the extension knows. A new filter file is registered here.
 *
 * @type {import('../src/core/filter-schema.js').Site[]}
 */
export const sites = [linkedin, reddit, x, youtube];
