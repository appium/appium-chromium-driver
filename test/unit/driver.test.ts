import {describe, it, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {fs} from 'appium/support.js';
import sinon from 'sinon';
import {ChromiumDriver} from '../../lib/driver.js';
import type {BrowserInfo, ChromiumDriverCaps} from '../../lib/types.js';

type ExecutableTestAccess = {
  getExecutable(
    browserVersionInfo?: BrowserInfo,
    isAutodownloadEnabled?: boolean,
  ): Promise<string | undefined>;
};

class TestDriver extends ChromiumDriver {
  setOpts(opts: Partial<ChromiumDriverCaps>): void {
    Object.assign(this.opts, opts);
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

  it('delegates executable resolution to msedge orchestrator for Edge', async () => {
    sinon.stub(fs, 'glob').resolves(['/auto/msedgedriver']);
    const driver = new TestDriver();
    driver.setOpts({browserName: 'msedge', executableDir: '/tmp/msedgedrivers'});
    assert.equal(await driver.getExecutableExposed(), '/auto/msedgedriver');
  });

  it('keeps Chrome executable unresolved when no explicit executable set', async () => {
    const driver = new TestDriver();
    driver.setOpts({browserName: 'chrome'});
    assert.equal(await driver.getExecutableExposed(), undefined);
  });
});
