import assert from 'node:assert/strict';
import {describe, it, afterEach} from 'node:test';

import type {ChromedriverOpts} from 'appium-chromedriver';
import {fs} from 'appium/support.js';
import sinon from 'sinon';

import {ALLOW_ANY_EXECUTABLE_FEATURE, ChromiumDriver} from '../../lib/driver.js';
import type {BrowserInfo, ChromiumDriverCaps} from '../../lib/types.js';

type ExecutableTestAccess = {
  getExecutable(browserVersionInfo?: BrowserInfo, isAutodownloadEnabled?: boolean): Promise<string | undefined>;
};

class TestDriver extends ChromiumDriver {
  setOpts(opts: Partial<ChromiumDriverCaps>): void {
    Object.assign(this.opts, opts);
  }

  getChromedriverOptsExposed(): Promise<ChromedriverOpts> {
    return (this as unknown as {getChromedriverOpts(): Promise<ChromedriverOpts>}).getChromedriverOpts();
  }

  getExecutableExposed(): Promise<string | undefined> {
    return (this as unknown as ExecutableTestAccess).getExecutable();
  }
}

describe('driver', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('exports ChromiumDriver', () => {
    assert.ok(new ChromiumDriver());
  });

  it('supports standard W3C locator strategies', () => {
    const driver = new ChromiumDriver();
    for (const strategy of ['css selector', 'link text', 'partial link text', 'tag name', 'xpath']) {
      assert.doesNotThrow(() => driver.validateLocatorStrategy(strategy));
    }
  });

  it('delegates executable resolution to msedge orchestrator for Edge', async () => {
    sinon.stub(fs, 'glob').resolves(['/auto/msedgedriver']);
    sinon.stub(fs, 'stat').resolves({isFile: () => true} as Awaited<ReturnType<typeof fs.stat>>);
    const driver = new TestDriver();
    driver.setOpts({browserName: 'msedge', executableDir: '/tmp/msedgedrivers'});
    assert.equal(await driver.getExecutableExposed(), '/auto/msedgedriver');
  });

  it('keeps Chrome executable unresolved when no explicit executable set', async () => {
    const driver = new TestDriver();
    driver.setOpts({browserName: 'chrome'});
    assert.equal(await driver.getExecutableExposed(), undefined);
  });

  describe('executable verification', () => {
    it('does not allow unverified executables by default', async () => {
      const driver = new TestDriver();
      driver.setOpts({browserName: 'chrome'});
      assert.equal((await driver.getChromedriverOptsExposed()).allowUnverifiedExecutable, false);
    });

    it('allows unverified executables if the server feature is enabled', async () => {
      const driver = new TestDriver();
      driver.setOpts({browserName: 'chrome'});
      const isFeatureEnabled = sinon.stub(driver, 'isFeatureEnabled').returns(true);
      assert.equal((await driver.getChromedriverOptsExposed()).allowUnverifiedExecutable, true);
      sinon.assert.calledWith(isFeatureEnabled, ALLOW_ANY_EXECUTABLE_FEATURE);
    });
  });
});
