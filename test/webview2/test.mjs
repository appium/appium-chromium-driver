import path from 'node:path';
import process from 'node:process';

const appBinary = path.resolve(process.env.WEBVIEW2_EXE);

async function main() {
  const appiumPkg = await import('appium');
  const appium = await appiumPkg.default.main({port: 4780});

  try {
    const {remote} = await import('webdriverio');
    const driver = await remote({
      hostname: '127.0.0.1',
      port: 4780,
      connectionRetryCount: 0,
      capabilities: {
        platformName: 'windows',
        browserName: 'msedge',
        'appium:automationName': 'Chromium',
        'appium:newCommandTimeout': 300,
        'appium:executable': 'C:\\SeleniumWebDrivers\\EdgeDriver\\msedgedriver.exe',
        'ms:edgeOptions': {
          binary: appBinary,
        },
      },
    });

    await driver.deleteSession();
  } finally {
    await appium.close();
  }
}

try {
  await main();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
}
