// Runs the built extension in a real browser against stand-ins for the
// supported sites. Build first:  npm run test:e2e

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { STATE_ATTRIBUTE } from '../../src/core/state-attribute.js';
import { launchWithExtension } from './support/browser.js';

const NOTE = '"Feed killed."';

let browser;

before(async () => {
  browser = await launchWithExtension();
});

after(async () => {
  await browser?.close();
});

async function open(url) {
  const page = await browser.context.newPage();
  await page.goto(url);
  return page;
}

const isShown = (page, selector) => page.locator(selector).first().isVisible();

/** The note the extension puts in place of a feed, or "none". */
const noteIn = (page, selector) =>
  page.locator(selector).evaluate((element) => getComputedStyle(element, '::before').content);

const heightOf = (page, selector) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => element.getBoundingClientRect().height);

/** Gives the page time to do whatever it would do in reaction to its layout. */
const settle = (page) => page.waitForTimeout(300);

/** Waits until exactly these rules are in force on the page. */
const rulesInForce = (page, ruleIds) =>
  page.waitForFunction(
    ([attribute, expected]) => document.documentElement.getAttribute(attribute) === expected,
    [STATE_ATTRIBUTE, ruleIds],
  );

test('Reddit: the home feed is replaced by a note before the page renders', async () => {
  const page = await open('https://www.reddit.com/');

  assert.equal(await page.evaluate(() => window.stateAtStart), 'feed');
  assert.equal(await isShown(page, 'article'), false);
  assert.equal(await isShown(page, '#interest-feed-header'), false);
  assert.equal(await noteIn(page, 'shreddit-feed'), NOTE);
  assert.ok((await heightOf(page, 'shreddit-feed')) < 300);
  await page.close();
});

test('Reddit: a hidden feed never loads another page', async () => {
  const page = await open('https://www.reddit.com/r/popular/');

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await settle(page);

  assert.equal(await page.evaluate(() => window.pagesLoaded), 0);
  assert.equal(await heightOf(page, 'article'), 600, 'parked posts keep their size');
  await page.close();
});

test('Reddit: hidden posts cannot be reached with the keyboard', async () => {
  const page = await open('https://www.reddit.com/');
  const stops = [];

  for (let press = 0; press < 2; press += 1) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate(() => document.activeElement.id));
  }

  // The post links sit between these two in the document.
  assert.deepEqual(stops, ['search', 'policies']);
  await page.close();
});

test('Reddit: single posts and communities are left alone', async () => {
  for (const path of ['/r/programming/comments/1abc23/a_post/', '/r/programming/']) {
    const page = await open(`https://www.reddit.com${path}`);

    assert.equal(await page.evaluate(() => window.stateAtStart), null, path);
    assert.equal(await isShown(page, 'article'), true, path);
    assert.equal(await isShown(page, '#interest-feed-header'), true, path);
    assert.equal(await noteIn(page, 'shreddit-feed'), 'none', path);
    await page.close();
  }
});

test('LinkedIn: the feed goes, the box for starting a post stays', async () => {
  const page = await open('https://www.linkedin.com/feed/');
  await settle(page);

  assert.equal(await isShown(page, '#composer'), true);
  assert.equal(await isShown(page, '.post'), false);
  assert.equal(await isShown(page, '#sort'), false);
  assert.equal(await noteIn(page, '[data-testid="mainFeed"]'), NOTE);
  assert.ok((await heightOf(page, '[data-testid="mainFeed"]')) < 300, 'the posts take up no room');
  assert.equal(await page.evaluate(() => window.pagesLoaded), 0);
  await page.close();
});

test('LinkedIn: a single post is left alone', async () => {
  const page = await open('https://www.linkedin.com/feed/update/urn:li:activity:7123456789/');

  assert.equal(await isShown(page, '.post'), true);
  await page.close();
});

test('X: the home timeline goes, writing a post stays possible', async () => {
  const page = await open('https://x.com/home');

  assert.equal(await isShown(page, '[data-testid="tweet"]'), false);
  assert.equal(await isShown(page, '[data-testid="pillLabel"]'), false);
  assert.equal(await isShown(page, '#composer'), true);
  assert.equal(await noteIn(page, 'section'), NOTE);
  await page.close();
});

test('X: profiles and single posts are left alone', async () => {
  for (const path of ['/someone', '/someone/status/1234567890']) {
    const page = await open(`https://x.com${path}`);

    assert.equal(await isShown(page, '[data-testid="tweet"]'), true, path);
    assert.equal(await isShown(page, '[data-testid="pillLabel"]'), true, path);
    await page.close();
  }
});

test('X: moving to the timeline inside the app hides it at once', async () => {
  const page = await open('https://x.com/someone');

  await page.evaluate(() => window.app.go('/home', 'home'));

  assert.equal(await isShown(page, '[data-testid="tweet"]'), false);
  await page.close();
});

test('X: the timeline stays hidden behind a dialog with its own address', async () => {
  const page = await open('https://x.com/home');

  await page.evaluate(() => window.app.openDialog('/compose/post'));
  assert.equal(await isShown(page, '#dialog'), true);
  assert.equal(await isShown(page, '[data-testid="tweet"]'), false, 'behind the open dialog');

  await page.evaluate(() => window.app.closeDialog());
  await page.waitForURL('**/home');
  assert.equal(await isShown(page, '[data-testid="tweet"]'), false, 'after closing the dialog');
  await page.close();
});

test('X: the timeline stays hidden until the app has swapped it for the next page', async () => {
  const page = await open('https://x.com/home');

  const swapped = page.evaluate(() => window.app.go('/notifications', 'notifications', 400));
  await page.waitForURL('**/notifications');
  assert.equal(await isShown(page, '[data-screen="home"] article'), false, 'while the app still shows it');

  await swapped;
  assert.equal(await isShown(page, '[data-screen="notifications"] article'), true);
  assert.equal(await noteIn(page, 'section'), 'none');
  await page.close();
});

test('X: a timeline refilled in place for another page is shown', async () => {
  const page = await open('https://x.com/home');

  await page.evaluate(() => window.app.refill('/someone', 'someone'));

  await page.locator('[data-screen="someone"] article').waitFor({ state: 'visible' });
  assert.equal(await noteIn(page, 'section'), 'none');
  await page.close();
});

test('YouTube: the recommendations on the start page are replaced by a note', async () => {
  const page = await open('https://www.youtube.com/');
  await settle(page);

  assert.equal(await isShown(page, 'ytd-rich-item-renderer'), false);
  assert.equal(await isShown(page, '#header'), false);
  assert.equal(await noteIn(page, 'ytd-rich-grid-renderer'), NOTE);
  assert.equal(await page.evaluate(() => window.pagesLoaded), 0);
  await page.close();
});

test('YouTube: next to a video the recommendations go, the video stays', async () => {
  const page = await open('https://www.youtube.com/watch?v=abc123');

  assert.equal(await isShown(page, '#player'), true);
  assert.equal(await isShown(page, '.suggestion'), false);
  assert.equal(await isShown(page, '#related-skeleton'), false);
  assert.equal(await noteIn(page, 'ytd-watch-flexy > #related'), NOTE);
  await page.close();
});

test('YouTube: subscriptions are left alone', async () => {
  const page = await open('https://www.youtube.com/feed/subscriptions');

  assert.equal(await isShown(page, 'ytd-rich-item-renderer'), true);
  assert.equal(await noteIn(page, 'ytd-rich-grid-renderer'), 'none');
  await page.close();
});

test('YouTube: a rule lets go of a page the app merely hides', async () => {
  const page = await open('https://www.youtube.com/');
  await rulesInForce(page, 'home');

  await page.evaluate(() => window.app.go('/watch?v=abc123'));
  await rulesInForce(page, 'up-next');
  assert.equal(await isShown(page, '#player'), true);

  await page.goBack();
  await rulesInForce(page, 'home');
  assert.equal(await isShown(page, 'ytd-rich-item-renderer'), false);
  await page.close();
});

test('Popup: lists every site and switches a single one off and on again', async () => {
  const reddit = await open('https://www.reddit.com/');
  const x = await open('https://x.com/home');
  const popup = await open(browser.popupUrl);

  assert.deepEqual(await popup.locator('.site__name').allTextContents(), [
    'LinkedIn',
    'Reddit',
    'X',
    'YouTube',
  ]);
  assert.equal(await popup.locator('#summary').textContent(), 'Feeds are hidden on 4 sites.');

  await popup.getByRole('switch', { name: 'Reddit' }).click();
  assert.equal(await popup.locator('#summary').textContent(), 'Feeds are hidden on 3 of 4 sites.');
  await reddit.locator('article').first().waitFor({ state: 'visible' });
  assert.equal(await isShown(x, '[data-testid="tweet"]'), false, 'other sites stay as they are');

  await popup.getByRole('switch', { name: 'Reddit' }).click();
  await reddit.locator('article').first().waitFor({ state: 'hidden' });

  await Promise.all([reddit.close(), x.close(), popup.close()]);
});

test('Popup: the main switch pauses everything and remembers it', async () => {
  const x = await open('https://x.com/home');
  const popup = await open(browser.popupUrl);

  await popup.getByRole('switch', { name: 'Hide feeds' }).click();
  assert.equal(await popup.locator('#summary').textContent(), 'Paused. Feeds are visible everywhere.');
  assert.equal(await popup.getByRole('switch', { name: 'X' }).isDisabled(), true);
  await x.locator('[data-testid="tweet"]').first().waitFor({ state: 'visible' });

  const later = await open('https://www.reddit.com/');
  await later.locator('article').first().waitFor({ state: 'visible' });

  await popup.reload();
  assert.equal(await popup.getByRole('switch', { name: 'Hide feeds' }).isChecked(), false);

  await popup.getByRole('switch', { name: 'Hide feeds' }).click();
  await x.locator('[data-testid="tweet"]').first().waitFor({ state: 'hidden' });

  await Promise.all([x.close(), later.close(), popup.close()]);
});
