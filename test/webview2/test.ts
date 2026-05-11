import path from 'node:path';
import process from 'node:process';
import {spawn, type ChildProcess} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';

const webview2Exe = process.env.WEBVIEW2_EXE;
const debugPort = Number(process.env.WEBVIEW2_DEBUG_PORT ?? 9222);

if (!webview2Exe) {
  throw new Error('WEBVIEW2_EXE environment variable is required');
}

const appBinary = path.resolve(webview2Exe);

async function waitForDebuggerEndpoint(port: number): Promise<void> {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  const timeoutAt = Date.now() + 60_000;
  let lastError: unknown;

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        await response.json();
        return;
      }

      lastError = new Error(`Unexpected status ${response.status} from ${endpoint}`);
    } catch (err) {
      lastError = err;
    }

    await sleep(1000);
  }

  throw new Error(`Timed out waiting for debugger endpoint ${endpoint}: ${String(lastError)}`);
}

function launchWebView2App(): ChildProcess {
  const additionalBrowserArguments = process.env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS ?? '';
  const remoteDebuggingArgument = `--remote-debugging-port=${debugPort}`;
  const env = {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: additionalBrowserArguments.includes('--remote-debugging-port=')
      ? additionalBrowserArguments
      : additionalBrowserArguments
        ? `${additionalBrowserArguments} ${remoteDebuggingArgument}`
        : remoteDebuggingArgument,
  };

  return spawn(appBinary, [], {
    env,
    stdio: 'ignore',
    windowsHide: true,
  });
}

async function main(): Promise<void> {
  const appiumPkg = await import('appium');
  const appium = await appiumPkg.default.main({port: 4780});
  const webview2App = launchWebView2App();
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
    await waitForDebuggerEndpoint(debugPort);

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
    if (!webview2App.killed) {
      webview2App.kill();
    }
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
