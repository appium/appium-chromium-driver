import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {getDefaultChromeDriverDir, getDefaultMsEdgeDriverDir} from '../../lib/utils/index.js';
import {LOCAL_PACKAGE_STORAGE_NAME} from '../../lib/utils/storage.js';

describe('storage', () => {
  it('uses the package storage name for strongbox', () => {
    assert.equal(LOCAL_PACKAGE_STORAGE_NAME, 'appium-chromium-driver');
  });

  it('returns distinct default directories for Chrome and Edge drivers', () => {
    const chromeDir = getDefaultChromeDriverDir();
    const edgeDir = getDefaultMsEdgeDriverDir();
    assert.notEqual(chromeDir, edgeDir);
    assert.match(chromeDir, /chromedrivers/);
    assert.match(edgeDir, /msedgedrivers/);
  });
});
