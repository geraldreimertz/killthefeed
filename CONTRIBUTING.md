# Contributing

Sites change their pages all the time. When a feed comes back, the fix is
almost always one selector in one JSON file, and you are welcome to send it.

## Set up

You need Node.js 20.11 or newer.

```bash
npm install
npm run build
```

Open `chrome://extensions`, switch on **Developer mode**, choose
**Load unpacked** and pick the `dist` folder. After a change, build again and
click the round arrow on the extension's card.

| Command            | What it does                                                              |
| ------------------ | ------------------------------------------------------------------------- |
| `npm run build`    | Builds the extension into `dist/`.                                        |
| `npm run dev`      | Rebuilds after every change in `src/` or `filters/`.                      |
| `npm test`         | Unit tests.                                                               |
| `npm run test:e2e` | Builds, then runs the extension in a real browser against stand-in pages. |
| `npm run package`  | Builds, then packs `dist/` into `kill-the-feed.zip`.                      |
| `npm run icons`    | Renders `assets/icon.svg` into the PNG sizes the browser needs.           |
| `npm run images`   | Renders the pictures in the README into `docs/`.                          |

The end-to-end tests and the two picture scripts use Playwright's Chromium. If
it is not on your machine yet: `npx playwright install chromium`.

## How it works

It is the cosmetic-filter idea from ad blockers, applied to feeds.

- Each site has a **filter list** in [`filters/`](filters): which pages have a
  feed, and which element holds it.
- The build turns every list into a stylesheet. The browser applies it before
  the page draws anything, so the feed never flashes up.
- A small content script watches the address and tells the stylesheet which
  rules are in force. That is what lets a single post work while the start page
  stays quiet, also inside single-page apps that never reload.
- A hidden feed is parked, not deleted: it keeps its size, clipped and
  invisible, one screen below its container. Feeds decide when to load more by
  looking at their own layout, and a feed that has collapsed to nothing tends to
  load forever. A parked feed thinks nobody has scrolled yet.

```text
filters/        one JSON file per site, registered in index.js
src/core/       rules, paths, stylesheet, settings: plain logic, no browser needed
src/platform/   the one place that talks to the browser's storage
src/content/    the script that runs on the sites
src/popup/      the panel behind the toolbar button
build/          build script, manifest, packaging, pictures
test/unit/      tests for src/core, the lists, the manifest and the privacy promises
test/e2e/       the built extension in a real browser
```

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

**What counts as a feed.** A stream that greets you without being asked. A
page someone goes to on purpose, such as a community, a profile or a search,
is not one and stays.

**Choosing selectors.** For `replace`, pick the element that contains the posts
_and_ whatever sits at their end to load more. Prefer hooks the site is
unlikely to rename: element names, ids, `data-testid`, `role`. Class names that
look generated change with every release. If one selector in a list stops
matching, the others keep working.

Use `hide` only for things that do not grow, such as a card or a button. A
list that loads more as you scroll belongs in `replace`.

### Adding a site

1. Create `filters/<id>.json`.
2. Register it in [`filters/index.js`](filters/index.js).
3. For every rule, add the pages it applies to and the pages it spares to
   [`test/unit/filters.test.js`](test/unit/filters.test.js).
4. Run `npm test`, then `npm run build`, and reload the extension.

The build refuses lists that break the format, and it runs every generated
stylesheet through a CSS parser.

## The look

The panel has one look and keeps it: white paper, near-black ink, Inter in its
lighter weights, hairlines instead of boxes, pills and dots, no colour. The
full stop after the name is the mark. A feed has no end, and this puts one
there.

The values live at the top of
[`src/popup/popup.css`](src/popup/popup.css) and, for the README pictures, in
[`docs/src/brand.css`](docs/src/brand.css). Changes to the panel should stay
inside them.

The note on a page ("Feed killed.") is the exception. It sits on someone
else's page, whose colours and fonts we cannot know, so it uses the system
typeface and one gray that reads on white and on black.

## Privacy is not negotiable

The extension makes no network requests and uses no browser feature besides
`storage`. [`test/unit/privacy.test.js`](test/unit/privacy.test.js) and the
last test in [`test/e2e/extension.test.js`](test/e2e/extension.test.js) hold
that line. A change that needs them loosened also needs
[PRIVACY.md](PRIVACY.md) rewritten, and a very good reason.

## Releasing

1. Raise `version` in `package.json` and commit.
2. Tag that commit with the same number and push the tag:

   ```bash
   git tag v0.2.0
   ```

   ```bash
   git push origin v0.2.0
   ```

GitHub then builds the extension from the tag, runs the tests and publishes
`kill-the-feed.zip`. The download link in the README always points to the
newest release.
