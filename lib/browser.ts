import path from 'node:path';
import {exec} from 'teen_process';

function winCandidates(subdirs: string[], exe: string): string[] {
  const bases = [
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'],
    process.env.LOCALAPPDATA,
  ];
  return bases.flatMap((base) => (base ? subdirs.map((sub) => path.join(base, sub, exe)) : []));
}

const DEFAULT_WIN_CHROME_CANDIDATES = () =>
  winCandidates(
    [
      'Google\\Chrome\\Application',
      'Google\\Chrome Beta\\Application',
      'Google\\Chrome Dev\\Application',
      'Chromium\\Application',
    ],
    'chrome.exe',
  );

const DEFAULT_WIN_EDGE_CANDIDATES = () =>
  winCandidates(
    [
      'Microsoft\\Edge\\Application',
      'Microsoft\\Edge Beta\\Application',
      'Microsoft\\Edge Dev\\Application',
    ],
    'msedge.exe',
  );
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
async function getBrowserVersionWin(binaryPath: string): Promise<string | null> {
  // Escape single quotes for PowerShell single-quoted strings
  const safePath = binaryPath.replace(/'/g, "''");
  try {
    const {stdout} = await exec('powershell', [
      '-NoProfile',
      '-Command',
      [
        `$target = '${safePath}'`,
        `if (-not [System.IO.Path]::IsPathRooted($target)) {`,
        `  $resolved = Get-Command $target -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source`,
        `  if ($resolved) { $target = $resolved }`,
        `}`,
        `if (Test-Path $target) { (Get-Item $target).VersionInfo.ProductVersion }`,
      ].join('; '),
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
 * On Unix, retrieve the browser version by running the binary with `--version` and parsing stdout.
 */
async function getBrowserVersionUnix(binary: string): Promise<string | null> {
  try {
    const {stdout} = await exec(binary, ['--version']);
    const match = /(\d+\.\d+\.\d+\.\d+)/.exec(stdout);
    if (match) {
      return match[1];
    }
  } catch {
    // binary not found or failed; caller will try next candidate
  }
  return null;
}

function getCandidates(isEdge: boolean): string[] {
  if (process.platform === 'win32') {
    return isEdge ? DEFAULT_WIN_EDGE_CANDIDATES() : DEFAULT_WIN_CHROME_CANDIDATES();
  } else if (process.platform === 'darwin') {
    return isEdge ? DEFAULT_MAC_EDGE_CANDIDATES : DEFAULT_MAC_CHROME_CANDIDATES;
  }
  return isEdge ? DEFAULT_LINUX_EDGE_CANDIDATES : DEFAULT_LINUX_CHROME_CANDIDATES;
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
): Promise<string> {
  const isEdge = /^(MicrosoftEdge|msedge)$/i.test(browserName ?? '');
  const candidates = chromeBinary ? [chromeBinary] : getCandidates(isEdge);

  for (const binary of candidates) {
    const version =
      process.platform === 'win32'
        ? await getBrowserVersionWin(binary)
        : await getBrowserVersionUnix(binary);
    if (version) {
      return version;
    }
  }
  throw new Error(`Could not determine browser version from candidates: ${candidates.join(', ')}`);
}
