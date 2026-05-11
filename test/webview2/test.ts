import path from 'node:path';
import process from 'node:process';

const webview2Exe = process.env.WEBVIEW2_EXE;
const debugPort = Number(process.env.WEBVIEW2_DEBUG_PORT ?? 9222);

if (!webview2Exe) {
  throw new Error('WEBVIEW2_EXE environment variable is required');
}

const appBinary = path.resolve(webview2Exe);

async function main(): Promise<void> {
  const appiumPkg = await import('appium');
  const appium = await appiumPkg.default.main({port: 4780});
  // WebView2 sample app that will be automated
  const capabilities: Record<string, unknown> = {
    platformName: 'windows',
    browserName: 'msedge',
    'appium:automationName': 'Chromium',
    'appium:autodownloadEnabled': true,
    'appium:newCommandTimeout': 300,
    'ms:edgeOptions': {
      binary: appBinary,
      debuggerAddress: `127.0.0.1:${debugPort}`,
      args: [`--remote-debugging-port=${debugPort}`],
    },
  };

  try {
    const {remote} = await import('webdriverio');
    const driver = await remote({
      hostname: '127.0.0.1',
      port: 4780,
      connectionRetryCount: 0,
      capabilities: capabilities as any,
    });

    // eslint-disable-next-line no-console
    console.log('WebView2 session created successfully');
    
    // Take a screenshot
    const screenshotData = await driver.takeScreenshot();
    // eslint-disable-next-line no-console
    console.log(`Screenshot taken: ${screenshotData.length} bytes`);
    
    // Get page source
    const pageSource = await driver.getPageSource();
    // eslint-disable-next-line no-console
    console.log(`Page source retrieved: ${pageSource.length} characters`);
    // eslint-disable-next-line no-console
    console.log('First 200 chars of page source:', pageSource.substring(0, 200));

    await driver.deleteSession();
  } finally {
    await appium.close();
  }
}

void (async () => {
  try {
    await main();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  }
})();
