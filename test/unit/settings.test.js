import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_SETTINGS,
  isBlocking,
  isSiteSwitchedOn,
  normalizeSettings,
  withEnabled,
  withSiteSwitched,
} from '../../src/core/settings.js';

test('without stored data everything is switched on', () => {
  assert.deepEqual(normalizeSettings(undefined), { enabled: true, disabledSites: [] });
  assert.ok(isBlocking(DEFAULT_SETTINGS, 'any-site'));
});

test('damaged stored data falls back to the defaults', () => {
  assert.deepEqual(normalizeSettings({ enabled: 'yes', disabledSites: 'x' }), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ enabled: false, disabledSites: ['x', 7, null] }), {
    enabled: false,
    disabledSites: ['x'],
  });
});

test('a site can be switched off and on again', () => {
  const off = withSiteSwitched(DEFAULT_SETTINGS, 'x', false);
  assert.ok(!isSiteSwitchedOn(off, 'x'));
  assert.ok(!isBlocking(off, 'x'));
  assert.ok(isBlocking(off, 'reddit'));

  assert.deepEqual(withSiteSwitched(off, 'x', true), DEFAULT_SETTINGS);
});

test('switching a site off twice lists it once', () => {
  const off = withSiteSwitched(withSiteSwitched(DEFAULT_SETTINGS, 'x', false), 'x', false);
  assert.deepEqual(off.disabledSites, ['x']);
});

test('the main switch overrides the sites but remembers their switches', () => {
  const paused = withEnabled(withSiteSwitched(DEFAULT_SETTINGS, 'x', false), false);

  assert.ok(!isBlocking(paused, 'reddit'));
  assert.ok(isSiteSwitchedOn(paused, 'reddit'));
  assert.ok(!isSiteSwitchedOn(paused, 'x'));
});

test('changes never touch the settings they start from', () => {
  withSiteSwitched(DEFAULT_SETTINGS, 'x', false);
  withEnabled(DEFAULT_SETTINGS, false);
  assert.deepEqual(DEFAULT_SETTINGS, { enabled: true, disabledSites: [] });
});
