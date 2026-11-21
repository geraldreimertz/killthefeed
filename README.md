# Kill the Feed

A browser extension that takes the endless feeds off social sites and leaves
everything else alone. You can still open a post someone sent you, search, read
your messages and write. You just can't fall into the scroll.

| Site      | What goes                                             | What stays                                                   |
| --------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Instagram | Stories and posts on the start page                   | Single posts and reels, profiles, search, messages           |
| LinkedIn  | The feed on the start page                            | Writing a post, single posts, profiles, search, messages     |
| Reddit    | Home, Popular, All, News                              | Communities, single posts, search, profiles                  |
| X         | Home timeline (For you, Following), Explore           | Writing a post, single posts, profiles, search, messages     |
| YouTube   | Recommendations on the start page and next to a video | The video itself, subscriptions, channels, search, playlists |

The rule of thumb: a feed is a stream that greets you without being asked.
A page you navigate to on purpose is not.

Not covered yet: YouTube Shorts, Instagram Reels and Instagram Explore. A
single Short or reel has the same kind of address as the endless feed behind
it, so hiding by address alone cannot tell them apart.

## Install from source

You need Node.js 20.11 or newer.

```bash
npm install
npm run build
```

Then open `chrome://extensions`, switch on **Developer mode**, choose
**Load unpacked** and pick the `dist` folder. Reload any tabs that were already
open.

The toolbar button opens a small panel with one switch per site and a main
switch that pauses everything.

## How it works

It is the cosmetic-filter idea from ad blockers, applied to feeds.

- Each site has a **filter list** in [`filters/`](filters): which pages have a
  feed, and which element holds it.
- The build turns every list into a stylesheet. The browser applies it before
  the page draws anything, so the feed never flashes up.
- A small content script watches the address and tells the stylesheet which
  rules are in force. That is what lets a single post work while the home page
  stays quiet, also inside single-page apps that never reload.
- A hidden feed is parked, not deleted: it keeps its size, clipped and
  invisible, one screen below its container. Feeds decide when to load more by
  looking at their own layout, and a feed that has collapsed to nothing tends to
  load forever. A parked feed thinks nobody has scrolled yet.

The extension asks for one permission, `storage`, to remember your switches. It
makes no network requests and collects nothing.

## Filter lists

A filter list is a JSON file. This is the whole format:

```json
{
  "id": "example",
  "name": "Example",
  "domains": ["example.com"],
  "rules": [
    {
      "id": "feed",
      "description": "The feed on the start page. Single posts are left alone.",
      "paths": ["/", "/trending/**"],
      "replace": ["main .feed"],
      "keep": [".composer"],
      "hide": [".new-posts-button"],
      "notes": "Anything the next maintainer should know."
    }
  ]
}
```

| Key           | Meaning                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `id`          | Lowercase letters, digits and dashes. Site ids are unique overall, rule ids within their site.         |
| `name`        | How people call the site. Shown in the panel.                                                         |
| `domains`     | Plain domains. Subdomains are included, so `example.com` also covers `www.example.com`.               |
| `description` | What the rule takes away and what it leaves, in plain words.                                          |
| `paths`       | The pages the rule applies to. See below.                                                             |
| `replace`     | Selectors of feed containers. Their content is parked and a short note takes its place.               |
| `keep`        | Optional. Direct children of a replaced container that stay visible, such as a box for writing a post. |
| `hide`        | Selectors of elements that simply disappear, such as a "new posts" button.                            |
| `notes`       | Optional. Free text for maintainers.                                                                  |

A rule needs `replace`, `hide` or both.

**Paths** are matched against the path of the address, ignoring case, query
string and a trailing slash.

| Pattern       | Matches                                    |
| ------------- | ------------------------------------------ |
| `/feed`       | `/feed` and `/feed/`, nothing below it     |
| `/r/*/wiki`   | `*` is exactly one segment: `/r/cats/wiki` |
| `/explore/**` | `/explore` and everything below it         |

List the pages that _have_ a feed. Everything else on the site is left alone
without you having to say so.

**Choosing selectors.** For `replace`, pick the element that contains the posts
_and_ whatever sits at their end to load more. Prefer hooks the site is
unlikely to rename: element names, ids, `data-testid`, `role`. Class names that
look generated change with every release. If one selector in a list stops
matching, the others keep working.

### Adding a site

1. Create `filters/<id>.json`.
2. Register it in [`filters/index.js`](filters/index.js).
3. Add the pages that must and must not be touched to
   [`test/unit/filters.test.js`](test/unit/filters.test.js).
4. Run `npm test`, then `npm run build`, and reload the extension.

The build refuses lists that break the format, and it runs every generated
stylesheet through a CSS parser.

## Development

| Command            | What it does                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| `npm run build`    | Builds the extension into `dist/`.                                       |
| `npm run dev`      | Rebuilds after every change in `src/` or `filters/`.                     |
| `npm test`         | Unit tests.                                                              |
| `npm run test:e2e` | Builds, then runs the extension in a real browser against stand-in pages. |
| `npm run icons`    | Renders `assets/icon.svg` into the PNG sizes the browser needs.          |

The end-to-end tests and the icon script use Playwright's Chromium. If it is
not on your machine yet: `npx playwright install chromium`.

```text
filters/        one JSON file per site, registered in index.js
src/core/       rules, paths, stylesheet, settings: plain logic, no browser needed
src/platform/   the one place that talks to the browser's storage
src/content/    the script that runs on the sites
src/popup/      the panel behind the toolbar button
build/          build script, manifest, icon rendering
test/unit/      tests for src/core, the lists and the manifest
test/e2e/       the built extension in a real browser
```

Sites change their markup. When a feed comes back, the fix is almost always one
selector in one JSON file.
