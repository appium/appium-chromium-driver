import {describe, it, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {waitForCondition} from 'asyncbox';

type AppiumServer = any;
type Browser = any;

const PLATFORM_ENV = process.env.TEST_PLATFORM || '';

const PLATFORM =
  PLATFORM_ENV.toLowerCase() === 'macos' ? 'mac' : PLATFORM_ENV.toLowerCase() || 'mac';
const PORT = Number(process.env.TEST_PORT) || 4780;
const HOST = '127.0.0.1';

const APPIUM_URL = `http://${HOST}:${PORT}`;
const TEST_PAGE_URL = 'https://www.saucedemo.com/';
const TEST_PAGE_TITLE = 'Swag Labs';

const DEF_CAPS: Record<string, any> = {
  platformName: PLATFORM,
  browserName: 'chrome',
  'appium:automationName': 'Chromium',
  'appium:autodownloadEnabled': true,
  'appium:newCommandTimeout': 300,
  webSocketUrl: true,
};

function getCiHeadlessArgs() {
  const args = process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [];
  args.push('--headless=new');
  return args;
}

function setBrowserOptions(optionName: string, binary: string) {
  DEF_CAPS[optionName] = {
    binary,
    args: getCiHeadlessArgs(),
  };
}

const isMsEdge = Boolean(process.env.IS_MSEDGE);
const msEdgeBin = process.env.MSEDGE_BIN;
const chromeBin = process.env.CHROME_BIN;

if (isMsEdge && msEdgeBin) {
  DEF_CAPS.browserName = 'msedge';
  setBrowserOptions('ms:edgeOptions', msEdgeBin);
} else if (!isMsEdge && chromeBin) {
  setBrowserOptions('goog:chromeOptions', chromeBin);
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

  before(async () => {
    const {remote} = await import('webdriverio');
    ctx.driver = await remote(WDIO_OPTS);
  });

  after(async () => {
    if (ctx.driver) {
      await ctx.driver.deleteSession();
      ctx.driver = null;
    }
  });

  return ctx;
}

describe('ChromeDriver', {timeout: 300_000}, () => {
  let appium: AppiumServer | null = null;

  before(async () => {
    const appiumPkg = await import('appium');
    appium = await appiumPkg.default.main({port: Number(PORT)});
  });

  after(async () => {
    if (appium) {
      await appium.close();
    }
  });

  describe('basic session handling', () => {
    const ctx = setupDriver();

    it('should navigate to a url', async () => {
      await ctx.driver!.navigateTo(`${APPIUM_URL}/status`);
    });

    it('should get page soruce', async () => {
      const pageSource = await ctx.driver!.getPageSource();
      assert.match(pageSource, /value.+build.+version/);
    });
  });

  describe('bidi commands', () => {
    const ctx = setupDriver();

    it('should navigate to a url', async () => {
      const d = ctx.driver!;
      const {contexts} = await d.browsingContextGetTree({});
      await d.browsingContextNavigate({
        context: contexts[0].context,
        url: TEST_PAGE_URL,
        wait: 'complete',
      });
      const url = await d.getUrl();
      assert.ok(url.includes('saucedemo.com'));
    });

    it('should execute javascript', async () => {
      const d = ctx.driver!;
      const {contexts} = await d.browsingContextGetTree({});
      const res = await d.scriptEvaluate({
        expression: 'document.title',
        target: {context: contexts[0].context},
        awaitPromise: false,
      });
      if ('result' in res && res.result && 'value' in res.result) {
        assert.deepEqual(res.result.value, TEST_PAGE_TITLE);
      } else {
        throw new Error('Unexpected scriptEvaluate result format');
      }
    });

    it('should receive bidi events', async () => {
      const d = ctx.driver!;
      const {contexts} = await d.browsingContextGetTree({});
      const context = contexts[0].context;
      const networkResponses: any[] = [];
      d.on('network.responseCompleted', (response: any) => networkResponses.push(response));
      await d.sessionSubscribe({
        events: ['network.responseCompleted'],
        contexts: [context],
      });

      await d.navigateTo('about:blank');
      const responsesBefore = networkResponses.length;

      await d.navigateTo(TEST_PAGE_URL);
      try {
        await waitForCondition(() => networkResponses.length > responsesBefore, {
          waitMs: 5000,
          intervalMs: 100,
        });
      } catch {
        assert.ok(networkResponses.length > responsesBefore);
      }
    });
  });
});
