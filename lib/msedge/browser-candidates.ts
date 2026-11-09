import {fs, system} from 'appium/support.js';

import {
  getWindowsExecutableCandidates,
  readBrowserVersion,
  readBrowserVersionFromWindowsRegistry,
} from '../utils/index.js';

const DEFAULT_WIN_REGISTRY_SUBKEYS = [
  'Microsoft\\Edge\\BLBeacon',
  'Microsoft\\Edge Beta\\BLBeacon',
  'Microsoft\\Edge Dev\\BLBeacon',
];

/**
 * Without an `ms:edgeOptions.binary`, msedgedriver only looks for `Microsoft\Edge\Application`
 * (stable Edge), in the same base folders and order as ChromeDriver. Beta and Dev stay as a
 * last resort.
 */
const DEFAULT_WIN_CANDIDATES = () =>
  getWindowsExecutableCandidates(
    ['Microsoft\\Edge\\Application', 'Microsoft\\Edge Beta\\Application', 'Microsoft\\Edge Dev\\Application'],
    'msedge.exe',
  );

const DEFAULT_MAC_CANDIDATES = [
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
  '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
];

const DEFAULT_LINUX_CANDIDATES = ['microsoft-edge', 'microsoft-edge-beta', 'microsoft-edge-dev', 'msedge'];

/**
 * Get platform-specific Microsoft Edge browser binary candidates.
 * @returns A list of executable paths or command names.
 */
export function getBrowserCandidates(): string[] {
  if (process.platform === 'win32') {
    return DEFAULT_WIN_CANDIDATES();
  } else if (process.platform === 'darwin') {
    return DEFAULT_MAC_CANDIDATES;
  }
  return DEFAULT_LINUX_CANDIDATES;
}

/**
 * Discover installed Microsoft Edge browser version from explicit binary or default candidates.
 * @param browserBinary Optional explicit browser binary path or command.
 * @returns Detected browser version.
 */
export async function discoverBrowserVersion(browserBinary?: string): Promise<string> {
  if (browserBinary) {
    const version = await readBrowserVersion(browserBinary);
    if (version) {
      return version;
    }
    throw new Error(`Could not determine browser version from binary: ${browserBinary}`);
  }

  if (system.isWindows()) {
    const registryVersion = await readBrowserVersionFromWindowsRegistry(DEFAULT_WIN_REGISTRY_SUBKEYS);
    if (registryVersion) {
      return registryVersion;
    }
  }

  const candidates = getBrowserCandidates();
  for (const binary of candidates) {
    // Reading a version on Windows spawns PowerShell, so skip the paths that don't exist.
    if (process.platform === 'win32' && !(await fs.exists(binary))) {
      continue;
    }
    const version = await readBrowserVersion(binary);
    if (version) {
      return version;
    }
  }
  throw new Error(`Could not determine browser version from candidates: ${candidates.join(', ')}`);
}
