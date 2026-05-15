import path from 'node:path';
import process from 'node:process';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {writeFile, mkdir} from 'node:fs/promises';

const webview2Exe = process.env.WEBVIEW2_EXE;
const debugPort = Number(process.env.WEBVIEW2_DEBUG_PORT ?? 9222);
const artifactDir = process.env.WEBVIEW2_ARTIFACT_DIR ?? './webview2-artifacts';

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
  // Ensure artifact directory exists
  await mkdir(artifactDir, {recursive: true});

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
    // It may take longer time, so launchign app though caps
    // is not used here.
    await waitForDebuggerEndpoint(debugPort);

    const appiumPkg = await import('appium');
    const appium = await appiumPkg.default.main({port: 4780});

    // WebView2 sample app that will be automated
    // Note: do NOT set 'binary' here since we're launching the app by ourselves
    const capabilities: Record<string, unknown> = {
      platformName: 'windows',
      browserName: 'msedge',
      'appium:automationName': 'Chromium',
      'appium:autodownloadEnabled': false,
      'appium:newCommandTimeout': 300,
      'appium:executable': 'C:\\SeleniumWebDrivers\\EdgeDriver\\msedgedriver.exe',
      'appium:verbose': true,
      'ms:edgeOptions': {
        binary: appBinary,
        debuggerAddress: `127.0.0.1:${debugPort}`,
        // args: [`--remote-debugging-port=${debugPort}`],
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

      const sessionType = (await driver.execute(() => {
        const win = globalThis as unknown as {
          chrome?: {
            webview?: {
              postMessage?: (...args: unknown[]) => void;
            };
          };
          navigator: Navigator & {
            userAgentData?: {
              brands?: Array<{brand: string; version: string}>;
            };
          };
        };

        const hasWebView2Bridge = Boolean(
          win.chrome?.webview && typeof win.chrome.webview.postMessage === 'function',
        );
        const brands = win.navigator.userAgentData?.brands ?? [];

        return {
          hasWebView2Bridge,
          userAgent: win.navigator.userAgent,
          brands,
        };
      })) as unknown as {
        hasWebView2Bridge: boolean;
        userAgent: string;
        brands: Array<{brand: string; version: string}>;
      };

      const sessionTypePath = path.join(artifactDir, 'session-type.json');
      await writeFile(sessionTypePath, JSON.stringify(sessionType, null, 2));
      // eslint-disable-next-line no-console
      console.log(
        `Session type: ${sessionType.hasWebView2Bridge ? 'WebView2' : 'MSEdge/Chromium tab'} (details: ${sessionTypePath})`,
      );

      // Take a screenshot and save it
      const screenshotData = await driver.takeScreenshot();
      const screenshotPath = path.join(artifactDir, 'screenshot.png');
      await writeFile(screenshotPath, Buffer.from(screenshotData, 'base64'));
      // eslint-disable-next-line no-console
      console.log(`Screenshot saved to ${screenshotPath}`);

      // Get page source and save it
      const pageSource = await driver.getPageSource();
      const pageSourcPath = path.join(artifactDir, 'page-source.html');
      await writeFile(pageSourcPath, pageSource);
      // eslint-disable-next-line no-console
      console.log(`Page source saved to ${pageSourcPath}`);
      // eslint-disable-next-line no-console
      console.log('First 200 chars:', pageSource.substring(0, 200));

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
