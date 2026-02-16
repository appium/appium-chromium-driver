/* eslint-disable mocha/no-top-level-hooks */
import {waitForCondition} from 'asyncbox';
import path from 'node:path';
import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';

type AppiumServer = any;
type Browser = any;

use(chaiAsPromised);

const PLATFORM_ENV = process.env.TEST_PLATFORM || '';

const PLATFORM =
  PLATFORM_ENV.toLowerCase() === 'macos' ? 'mac' : PLATFORM_ENV.toLowerCase() || 'mac';
const PORT = Number(process.env.TEST_PORT) || 4780;
const HOST = '127.0.0.1';
const CHROME_BIN = process.env.TEST_CHROME;

const SERVER_URL = `http://${HOST}:${PORT}`;

const DEF_CAPS: Record<string, any> = {
  platformName: PLATFORM,
  browserName: 'chrome',
  'appium:automationName': 'Chromium',
  'appium:autodownloadEnabled': true,
  'appium:newCommandTimeout': 300,
  webSocketUrl: true,
};

// GitHub Actions
if (process.env.CHROMEWEBDRIVER) {
  DEF_CAPS['appium:executable'] = path.join(
    process.env.CHROMEWEBDRIVER,
    `chromedriver${process.platform === 'win32' ? '.exe' : ''}`,
  );
}

if (CHROME_BIN) {
  DEF_CAPS['goog:chromeOptions'] = {
    binary: CHROME_BIN,
  };
}

const WDIO_OPTS = {
  hostname: HOST,
  port: PORT as number,
  connectionRetryCount: 0,
  capabilities: DEF_CAPS,
};

function setupDriver() {
  /** @type {{driver: Browser | null}} */
  const ctx: {driver: Browser | null} = {driver: null};

  before(async function () {
    const {remote} = await import('webdriverio');
    ctx.driver = await remote(WDIO_OPTS);
  });

  after(async function () {
    if (ctx.driver) {
      await ctx.driver.deleteSession();
      ctx.driver = null;
    }
  });

  return ctx;
}

describe('ChromeDriver', function () {
  let appium: AppiumServer | null = null;

  before(async function () {
    const appiumPkg = await import('appium');
    appium = await appiumPkg.default.main({port: Number(PORT)});
  });

  after(async function () {
    if (appium) {
      await appium.close();
    }
  });

  describe('basic session handling', function () {
    const ctx = setupDriver();

    it('should navigate to a url', async function () {
      await ctx.driver!.navigateTo(`${SERVER_URL}/status`);
    });

    it('should get page soruce', async function () {
      const pageSource = await ctx.driver!.getPageSource();
      expect(pageSource).to.match(/value.+build.+version/);
    });
  });

  describe('bidi commands', function () {
    const ctx = setupDriver();

    it('should navigate to a url', async function () {
      const d = ctx.driver!;
      const {contexts} = await d.browsingContextGetTree({});
      await d.browsingContextNavigate({
        context: contexts[0].context,
        url: `${SERVER_URL}/test/guinea-pig`,
        wait: 'complete',
      });
      const url = await d.getUrl();
      expect(url).to.include('guinea-pig');
    });

    it('should execute javascript', async function () {
      const d = ctx.driver!;
      const {contexts} = await d.browsingContextGetTree({});
      const res = await d.scriptEvaluate({
        expression: 'document.title',
        target: {context: contexts[0].context},
        awaitPromise: false,
      });
      if ('result' in res && res.result && 'value' in res.result) {
        expect(res.result.value).to.eql('I am a page title');
      } else {
        throw new Error('Unexpected scriptEvaluate result format');
      }
    });

    it('should receive bidi events', async function () {
      const d = ctx.driver!;
      const {contexts} = await d.browsingContextGetTree({});
      const networkResponses: any[] = [];
      d.on('network.responseCompleted', (response) => networkResponses.push(response));
      await d.sessionSubscribe({
        events: ['network.responseCompleted'],
        contexts: [contexts[0].context],
      });
      expect(networkResponses).to.be.empty;
      await d.navigateTo(`${SERVER_URL}/test/guinea-pig`);
      try {
        await waitForCondition(
          () => {
            try {
              expect(networkResponses).to.not.be.empty;
              return true;
            } catch {
              return false;
            }
          },
          {
            waitMs: 5000,
            intervalMs: 100,
          },
        );
      } catch {
        expect(networkResponses).to.not.be.empty;
      }
    });
  });
});
