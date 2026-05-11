import path from 'node:path';
import process from 'node:process';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';

const webview2Exe = process.env.WEBVIEW2_EXE;
const debugPort = Number(process.env.WEBVIEW2_DEBUG_PORT ?? 9222);

if (!webview2Exe) {
  throw new Error('WEBVIEW2_EXE environment variable is required');
}

const appBinary = path.resolve(webview2Exe);

async function waitForDebuggerEndpoint(port: number, timeoutMs: number = 30000): Promise<void> {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        // eslint-disable-next-line no-console
        console.log(`Debugger endpoint ready at ${endpoint}`);
        return;
      }
    } catch {
      // Endpoint not ready yet, retry
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for debugger endpoint at ${endpoint}`);
}

async function main(): Promise<void> {
  // Start the WebView2 app with remote debugging port
  // eslint-disable-next-line no-console
  console.log(`Launching WebView2 app: ${appBinary}`);
  const appProc = spawn(appBinary, [], {
    windowsHide: true,
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${debugPort}`,
    },
  });

  try {
    // Wait for the debugger endpoint to be ready
    await waitForDebuggerEndpoint(debugPort);

    const appiumPkg = await import('appium');
    const appium = await appiumPkg.default.main({port: 4780});

    // WebView2 sample app that will be automated
    // Note: do NOT set 'binary' here since we're launching the app ourselves
    const capabilities: Record<string, unknown> = {
      platformName: 'windows',
      browserName: 'msedge',
      'appium:automationName': 'Chromium',
      'appium:autodownloadEnabled': false,
      'appium:newCommandTimeout': 300,
      'appium:executable': 'C:\\SeleniumWebDrivers\\EdgeDriver\\msedgedriver.exe',
      'ms:edgeOptions': {
        debuggerAddress: `127.0.0.1:${debugPort}`,
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
  } finally {
    if (!appProc.killed) {
      appProc.kill();
    }
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
