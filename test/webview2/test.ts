import path from 'node:path';
import process from 'node:process';
import os from 'node:os';
import net from 'node:net';
import {spawn, type ChildProcess} from 'node:child_process';
import {access, mkdir, writeFile} from 'node:fs/promises';

const webview2Exe = process.env.WEBVIEW2_EXE;
const debugPort = Number(process.env.WEBVIEW2_DEBUG_PORT ?? 9222);

if (!webview2Exe) {
  throw new Error('WEBVIEW2_EXE environment variable is required');
}

const appBinary = path.resolve(webview2Exe);
const profileDir = path.join(os.tmpdir(), `appium-webview2-profile-${Date.now()}`);

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function runPowerShell(command: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ps = spawn('powershell', ['-NoProfile', '-Command', command], {
      windowsHide: true,
    });
    let stderr = '';
    ps.stderr.on('data', (data) => {
      stderr += String(data);
    });
    ps.on('error', reject);
    ps.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`PowerShell failed (code ${code}): ${stderr}`));
      }
    });
  });
}

async function waitForPort(port: number, timeoutMs = 20000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const connected = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({host: '127.0.0.1', port}, () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (connected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for debug port ${port}`);
}

async function detectEdgeMajorVersion(port: number): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${port}/json/version`);
  if (!res.ok) {
    throw new Error(`Failed to query debugger endpoint: ${res.status}`);
  }
  const info = (await res.json()) as {Browser?: string};
  const browser = info.Browser ?? '';
  const match = /Edg\/(\d+)\./.exec(browser);
  if (!match) {
    throw new Error(`Could not parse Edge version from Browser='${browser}'`);
  }
  return match[1];
}

async function ensureMatchingEdgeDriver(majorVersion: string): Promise<string> {
  const driverRoot = path.join(os.tmpdir(), 'appium-webview2-edgedriver', majorVersion);
  const driverExe = path.join(driverRoot, 'msedgedriver.exe');
  try {
    await access(driverExe);
    return driverExe;
  } catch {
    // Continue to download below.
  }

  await mkdir(driverRoot, {recursive: true});
  const latestRes = await fetch(
    `https://msedgedriver.microsoft.com/LATEST_RELEASE_${majorVersion}_WINDOWS`,
  );
  if (!latestRes.ok) {
    throw new Error(
      `Failed to resolve EdgeDriver release for major ${majorVersion}: ${latestRes.status}`,
    );
  }
  const exactVersion = (await latestRes.text()).trim();
  const zipRes = await fetch(
    `https://msedgedriver.microsoft.com/${exactVersion}/edgedriver_win64.zip`,
  );
  if (!zipRes.ok) {
    throw new Error(`Failed to download EdgeDriver ${exactVersion}: ${zipRes.status}`);
  }

  const zipPath = path.join(driverRoot, 'edgedriver_win64.zip');
  await writeFile(zipPath, Buffer.from(await zipRes.arrayBuffer()));
  await runPowerShell(
    `Expand-Archive -Path ${psQuote(zipPath)} -DestinationPath ${psQuote(driverRoot)} -Force`,
  );
  await access(driverExe);
  return driverExe;
}

async function main(): Promise<void> {
  const appiumPkg = await import('appium');
  const appium = await appiumPkg.default.main({port: 4780});
  let appProc: ChildProcess | undefined;

  appProc = spawn(appBinary, [], {
    windowsHide: true,
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${debugPort} --user-data-dir=${profileDir}`,
    },
  });

  await waitForPort(debugPort);
  const edgeMajorVersion = await detectEdgeMajorVersion(debugPort);
  const edgeDriverExe = await ensureMatchingEdgeDriver(edgeMajorVersion);

  // WebView2 sample app that will be automated
  const capabilities: Record<string, unknown> = {
    platformName: 'windows',
    browserName: 'msedge',
    'appium:automationName': 'Chromium',
    'appium:autodownloadEnabled': false,
    'appium:executable': edgeDriverExe,
    'appium:newCommandTimeout': 300,
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
    if (appProc && !appProc.killed) {
      appProc.kill();
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
