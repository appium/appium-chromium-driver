import {main as startAppium} from 'appium';
import {remote} from 'webdriverio';

const PLATFORM = process.env.TEST_PLATFORM || 'macOS';
const PORT = process.env.TEST_PORT || 4780;
const HOST = 'localhost';

const DEF_CAPS = {
  platformName: PLATFORM,
  browserName: 'chrome',
  'appium:automationName': 'Chrome',
};

const WDIO_OPTS = {
  hostname: HOST,
  port: PORT,
  connectionRetryCount: 1,
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
      await driver.deleteSession();
    });

    it('should navigate to a url', async function() {
      await driver.navigateTo(`http://${HOST}:${PORT}/status`);
    });
  });
});
