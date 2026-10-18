import {getWindowsExecutableCandidates, pathExists, readBrowserVersion} from '../utils/index.js';

/**
 * Without a `goog:chromeOptions.binary`, ChromeDriver launches the first `chrome.exe` it finds
 * in Google Chrome, then Chrome for Testing, then Chromium installation folders (each checked
 * in LOCALAPPDATA, PROGRAMFILES, PROGRAMFILES(X86) order) and never looks at Beta or Dev.
 * Detect versions in that same order so the downloaded chromedriver matches the browser that
 * actually starts; Beta and Dev stay as a last resort.
 */
const DEFAULT_WIN_CANDIDATES = () =>
  getWindowsExecutableCandidates(
    [
      'Google\\Chrome\\Application',
      'Google\\Chrome for Testing\\Application',
      'Chromium\\Application',
      'Google\\Chrome Beta\\Application',
      'Google\\Chrome Dev\\Application',
    ],
    'chrome.exe',
  );

const DEFAULT_MAC_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
  '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
  '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

const DEFAULT_LINUX_CANDIDATES = [
  'chrome',
  'google-chrome',
  'google-chrome-beta',
  'google-chrome-unstable',
  'chromium',
  'chromium-browser',
];

/**
 * List platform-specific Chrome/Chromium browser binary candidates.
 * @returns A list of executable paths or command names.
 */
export function listBrowserBinaryCandidates(): string[] {
  if (process.platform === 'win32') {
    return DEFAULT_WIN_CANDIDATES();
  } else if (process.platform === 'darwin') {
    return DEFAULT_MAC_CANDIDATES;
  }
  return DEFAULT_LINUX_CANDIDATES;
}

/**
 * Detect installed Chrome/Chromium browser version from explicit binary or default candidates.
 * @param browserBinary Optional explicit browser binary path or command.
 * @returns Detected browser version.
 */
export async function detectBrowserVersion(browserBinary?: string): Promise<string> {
  if (browserBinary) {
    const version = await readBrowserVersion(browserBinary);
    if (version) {
      return version;
    }
    throw new Error(`Could not determine browser version from binary: ${browserBinary}`);
  }

  const candidates = listBrowserBinaryCandidates();
  for (const binary of candidates) {
    // Reading a version on Windows spawns PowerShell, so skip the paths that don't exist.
    if (process.platform === 'win32' && !(await pathExists(binary))) {
      continue;
    }
    const version = await readBrowserVersion(binary);
    if (version) {
      return version;
    }
  }
  throw new Error(`Could not determine browser version from candidates: ${candidates.join(', ')}`);
}
