import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import * as msedgeModule from '../../lib/msedge/index';
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

describe('ChromeDriver', function () {
  it('should be exported', function () {
    const c = new ChromiumDriver({} as any);
    expect(c).to.exist;
  });
});

describe('ChromiumDriver executable resolution', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('getExecutable', function () {
    it('returns opts.executable directly for Chrome', async function () {
      const driver = new TestDriver({} as any);
      driver.setOpts({browserName: 'chrome', executable: '/custom/chromedriver'});
      expect(await driver.getExecutableExposed()).to.equal('/custom/chromedriver');
    });

    it('returns opts.executable directly for Edge', async function () {
      const driver = new TestDriver({} as any);
      driver.setOpts({browserName: 'msedge', executable: '/custom/msedgedriver'});
      expect(await driver.getExecutableExposed()).to.equal('/custom/msedgedriver');
    });

    it('returns undefined for non-Edge browser with no explicit executable', async function () {
      const driver = new TestDriver({} as any);
      driver.setOpts({browserName: 'chrome'});
      expect(await driver.getExecutableExposed()).to.be.undefined;
    });

    it('delegates to resolveDriverExecutable for Edge with no explicit executable', async function () {
      sinon.stub(msedgeModule, 'resolveDriverExecutable').resolves('/auto/msedgedriver');
      const driver = new TestDriver({} as any);
      driver.setOpts({browserName: 'msedge'});
      expect(await driver.getExecutableExposed()).to.equal('/auto/msedgedriver');
    });
  });

  describe('getExecutableDir', function () {
    it('returns opts.executableDir when set', function () {
      const driver = new TestDriver({} as any);
      driver.setOpts({browserName: 'chrome', executableDir: '/custom/drivers'});
      expect(driver.getExecutableDirExposed()).to.equal('/custom/drivers');
    });

    it('falls back to the appium-chromedriver package dir for Chrome', function () {
      const driver = new TestDriver({} as any);
      driver.setOpts({browserName: 'chrome'});
      expect(driver.getExecutableDirExposed()).to.include('chromedriver');
    });

    it('falls back to the default local storage dir for Edge', function () {
      const driver = new TestDriver({} as any);
      driver.setOpts({browserName: 'msedge'});
      expect(driver.getExecutableDirExposed()).to.include('msedgedrivers');
    });
  });
});
