import {main as startAppium} from 'appium';
import {remote} from 'webdriverio';

const PLATFORM = process.env.TEST_PLATFORM || 'macOS';
const PORT = process.env.TEST_PORT || 4780;
const HOST = '127.0.0.1';
const CHROME_BIN = process.env.TEST_CHROME;

const DEF_CAPS = {
  platformName: PLATFORM,
  browserName: 'chrome',
  'appium:automationName': 'Chromium',
};

if (CHROME_BIN) {
  DEF_CAPS['goog:chromeOptions'] = {
    binary: CHROME_BIN,
  };
}

const WDIO_OPTS = {
  hostname: HOST,
  port: PORT,
  connectionRetryCount: 0,
  capabilities: DEF_CAPS,
};

describe('ChromeDriver', function() {
  /** @type import('@appium/types').AppiumServer */
  let appium;

  before(async function() {
    appium = await startAppium({port: PORT});
  });

  after(async function() {
    await appium.close();
  });

  describe('basic session handling', function() {
    /** @type import('webdriverio').Browser<'async'> */
    let driver;

    before(async function() {
      driver = await remote(WDIO_OPTS);
    });

    after(async function() {
      if (driver) {
        await driver.deleteSession();
        driver = null;
      }
    });

    it('should navigate to a url', async function() {
      await driver.navigateTo(`http://${HOST}:${PORT}/status`);
    });

    it('should get page soruce', async function() {
      await driver.getPageSource().should.eventually.match(/value.+build.+version/);
    });
  });
});
