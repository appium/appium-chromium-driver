import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import * as msedgeModule from '../../lib/msedge';
import {ChromiumDriver} from '../../lib/driver';
import type {BrowserInfo} from '../../lib/types';

use(chaiAsPromised);

class TestDriver extends ChromiumDriver {
  setOpts(opts: Record<string, any>): void {
    Object.assign(this.opts, opts);
  }
  getExecutableExposed(browserVersionInfo?: BrowserInfo): Promise<string | undefined> {
    return (this as any).getExecutable(browserVersionInfo);
  }
  getExecutableDirExposed(): string | undefined {
    return (this as any).getExecutableDir();
  }
}

describe('driver', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('exports ChromiumDriver', function () {
    expect(new ChromiumDriver({} as any)).to.exist;
  });

  it('delegates executable resolution to msedge orchestrator for Edge', async function () {
    sinon.stub(msedgeModule, 'resolveDriverExecutable').resolves('/auto/msedgedriver');
    const driver = new TestDriver({} as any);
    driver.setOpts({browserName: 'msedge'});
    expect(await driver.getExecutableExposed()).to.equal('/auto/msedgedriver');
  });

  it('keeps Chrome executable unresolved when no explicit executable set', async function () {
    const driver = new TestDriver({} as any);
    driver.setOpts({browserName: 'chrome'});
    expect(await driver.getExecutableExposed()).to.be.undefined;
  });
});
