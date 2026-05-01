import path from 'node:path';
import process from 'node:process';
import Chromedriver from 'appium-chromedriver';

const edgeDriverExe = path.join(process.env.EDGEWEBDRIVER, 'msedgedriver.exe');
const appBinary = path.resolve(process.env.WEBVIEW2_EXE);

async function main() {
  const appiumPkg = await import('appium');
  const appium = await appiumPkg.default.main({port: 4780});

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
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
