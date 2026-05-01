import path from 'node:path';
import process from 'node:process';

const webview2Exe = process.env.WEBVIEW2_EXE;

if (!webview2Exe) {
  throw new Error('WEBVIEW2_EXE environment variable is required');
}

const appBinary = path.resolve(webview2Exe);

async function main(): Promise<void> {
  const appiumPkg = await import('appium');
  const appium = await appiumPkg.default.main({port: 4780});
  const capabilities: Record<string, unknown> = {
    platformName: 'windows',
    browserName: 'msedge',
    'appium:automationName': 'Chromium',
    'appium:newCommandTimeout': 300,
    'appium:executable': 'C:\\SeleniumWebDrivers\\EdgeDriver\\msedgedriver.exe',
    'ms:edgeOptions': {
      binary: appBinary,
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
