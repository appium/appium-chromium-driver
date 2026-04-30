import {getWindowsExecutableCandidates, readBrowserVersion} from '../utils';

const DEFAULT_WIN_CANDIDATES = () =>
  getWindowsExecutableCandidates(
    [
      'Microsoft\\Edge\\Application',
      'Microsoft\\Edge Beta\\Application',
      'Microsoft\\Edge Dev\\Application',
    ],
    'msedge.exe',
  );

const DEFAULT_MAC_CANDIDATES = [
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
  '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
];

const DEFAULT_LINUX_CANDIDATES = [
  'microsoft-edge',
  'microsoft-edge-beta',
  'microsoft-edge-dev',
  'msedge',
];

/**
 * List platform-specific Microsoft Edge browser binary candidates.
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
 * Detect installed Microsoft Edge browser version from explicit binary or default candidates.
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
    const version = await readBrowserVersion(binary);
    if (version) {
      return version;
    }
  }
  throw new Error(`Could not determine browser version from candidates: ${candidates.join(', ')}`);
}

export {
  detectBrowserVersion as discoverBrowserVersion,
  listBrowserBinaryCandidates as getBrowserCandidates,
};

