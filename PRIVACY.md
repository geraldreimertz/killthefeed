# Privacy

Kill the Feed collects nothing. This page says exactly what that means.

## What leaves your browser

Nothing. The extension makes no network requests. There is no server on the
other end, no analytics, no tracking, no advertising and no account.

## What it stores

Which switches you flipped: the main switch, and the sites you turned off.
That is all.

Chrome keeps this in its own storage for extensions. If you have switched on
sync in Chrome, Chrome copies it to your other browsers, the way it does with
your bookmarks. That copy travels through your Google account. It never
reaches us.

## What it can see

Chrome lets the extension work on the sites it supports, because hiding part
of a page means changing that page. Chrome words this as "read and change your
data" on those sites. On these pages the extension looks at two things:

- the address, to tell a feed page from a single post;
- the layout of the page, to find the part that holds the feed.

It does not read, record or send what is on the page: not what you look at,
not what you write.

The supported sites are listed in the [README](README.md#what-goes-what-stays).

## Permissions

One: `storage`, to remember your switches.

## Check it yourself

The code is in this repository, and it is small. Two tests guard the promises
on this page:

- [`test/unit/privacy.test.js`](test/unit/privacy.test.js) fails if the code
  contains any way to reach the network, any web address, or any use of
  cookies or of a page's own storage.
- [`test/e2e/extension.test.js`](test/e2e/extension.test.js) runs the finished
  extension in a real browser and fails if it sends a single request.

The file you download is built from this code by GitHub, not on someone's
computer. The build is described in
[`.github/workflows/release.yml`](.github/workflows/release.yml).

## If this ever changes

Then this page changes first, and the notes of that release say so.

## Questions

[Open an issue](https://github.com/geraldreimertz/killthefeed/issues/new/choose).

Last updated: 21 November 2026
