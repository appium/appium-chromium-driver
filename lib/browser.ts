import {exec} from 'teen_process';

type ExecFn = (binary: string, args: string[]) => Promise<{stdout: string}>;

const DEFAULT_WIN_CHROME_CANDIDATES = () => {
  const programFiles = process.env.PROGRAMFILES;
  const programFilesX86 = process.env['PROGRAMFILES(X86)'];
  const localAppData = process.env.LOCALAPPDATA;
  return [
    ...(programFiles
      ? [
          `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
          `${programFiles}\\Google\\Chrome Beta\\Application\\chrome.exe`,
          `${programFiles}\\Google\\Chrome Dev\\Application\\chrome.exe`,
          `${programFiles}\\Chromium\\Application\\chrome.exe`,
        ]
      : []),
    ...(programFilesX86
      ? [
          `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
          `${programFilesX86}\\Google\\Chrome Beta\\Application\\chrome.exe`,
          `${programFilesX86}\\Google\\Chrome Dev\\Application\\chrome.exe`,
        ]
      : []),
    ...(localAppData
      ? [
          `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
          `${localAppData}\\Google\\Chrome Beta\\Application\\chrome.exe`,
          `${localAppData}\\Google\\Chrome Dev\\Application\\chrome.exe`,
        ]
      : []),
  ];
};
const DEFAULT_WIN_EDGE_CANDIDATES = () => {
  const programFiles = process.env.PROGRAMFILES;
  const programFilesX86 = process.env['PROGRAMFILES(X86)'];
  const localAppData = process.env.LOCALAPPDATA;
  return [
    ...(programFiles
      ? [
          `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
          `${programFiles}\\Microsoft\\Edge Beta\\Application\\msedge.exe`,
          `${programFiles}\\Microsoft\\Edge Dev\\Application\\msedge.exe`,
        ]
      : []),
    ...(programFilesX86
      ? [
          `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
          `${programFilesX86}\\Microsoft\\Edge Beta\\Application\\msedge.exe`,
          `${programFilesX86}\\Microsoft\\Edge Dev\\Application\\msedge.exe`,
        ]
      : []),
    ...(localAppData
      ? [
          `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`,
          `${localAppData}\\Microsoft\\Edge Beta\\Application\\msedge.exe`,
          `${localAppData}\\Microsoft\\Edge Dev\\Application\\msedge.exe`,
        ]
      : []),
  ];
};
const DEFAULT_MAC_CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
  '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];
const DEFAULT_MAC_EDGE_CANDIDATES = [
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
  '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
];
const DEFAULT_LINUX_CHROME_CANDIDATES = [
  'google-chrome',
  'google-chrome-beta',
  'google-chrome-unstable',
  'chromium',
  'chromium-browser',
];
const DEFAULT_LINUX_EDGE_CANDIDATES = [
  'microsoft-edge',
  'microsoft-edge-beta',
  'microsoft-edge-dev',
  'msedge',
];

/**
 * On Windows, retrieve the browser version via PowerShell's VersionInfo instead of --version,
 * because Chrome/Edge do not reliably write to stdout when spawned via exec.
 */
async function getBrowserVersionWin(binaryPath: string, execFn: ExecFn): Promise<string | null> {
  // Escape single quotes for PowerShell single-quoted strings
  const safePath = binaryPath.replace(/'/g, "''");
  try {
    const {stdout} = await execFn('powershell', [
      '-NoProfile',
      '-Command',
      `(Get-Item '${safePath}').VersionInfo.ProductVersion`,
    ]);
    const version = stdout.trim();
    if (/^\d+\.\d+/.test(version)) {
      return version;
    }
  } catch {
    // binary not found or PowerShell failed; caller will try next candidate
  }
  return null;
}

/**
 * Get the version of the Chrome/Chromium/Edge browser by executing the binary with `--version` and parsing the output.
 * @param chromeBinary
 * @param browserName
 * @param execFn
 * @returns
 */
export async function getBrowserVersion(
  chromeBinary?: string,
  browserName?: string,
  execFn: ExecFn = exec,
): Promise<string> {
  const isChrome = /chrome|chromium/i.test(browserName ?? '');
  const isEdge = /edge/i.test(browserName ?? '');
  let defaultCandidates: string[];
  if (process.platform === 'win32') {
    if (isChrome) defaultCandidates = DEFAULT_WIN_CHROME_CANDIDATES();
    else if (isEdge) defaultCandidates = DEFAULT_WIN_EDGE_CANDIDATES();
    else defaultCandidates = [...DEFAULT_WIN_CHROME_CANDIDATES(), ...DEFAULT_WIN_EDGE_CANDIDATES()];
  } else if (process.platform === 'darwin') {
    if (isChrome) defaultCandidates = DEFAULT_MAC_CHROME_CANDIDATES;
    else if (isEdge) defaultCandidates = DEFAULT_MAC_EDGE_CANDIDATES;
    else defaultCandidates = [...DEFAULT_MAC_CHROME_CANDIDATES, ...DEFAULT_MAC_EDGE_CANDIDATES];
  } else {
    // Linux and other Unixes
    if (isChrome) defaultCandidates = DEFAULT_LINUX_CHROME_CANDIDATES;
    else if (isEdge) defaultCandidates = DEFAULT_LINUX_EDGE_CANDIDATES;
    else defaultCandidates = [...DEFAULT_LINUX_CHROME_CANDIDATES, ...DEFAULT_LINUX_EDGE_CANDIDATES];
  }
  const candidates = chromeBinary ? [chromeBinary] : defaultCandidates;

  for (const binary of candidates) {
    if (process.platform === 'win32') {
      const version = await getBrowserVersionWin(binary, execFn);
      if (version) {
        return version;
      }
      continue;
    }
    try {
      const {stdout} = await execFn(binary, ['--version']);
      const match = /(?:Chrome|Chromium|Edg(?:e|HTML)?)\/([\d.]+)/.exec(stdout);
      if (match) {
        return match[1];
      }
      // Some builds print "Google Chrome X.Y.Z.W" or "Microsoft Edge X.Y.Z.W" without a slash
      const fallback = /(?:Google Chrome|Chromium|Microsoft Edge)\s+([\d.]+)/.exec(stdout);
      if (fallback) {
        return fallback[1];
      }
    } catch {
      // binary not found or failed; try next candidate
    }
  }
  throw new Error(`Could not determine browser version from candidates: ${candidates.join(', ')}`);
}
