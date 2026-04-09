import {exec} from 'teen_process';

type ExecFn = (binary: string, args: string[]) => Promise<{stdout: string}>;
export type BrowserInfo = {
  info: {Browser: string} & Record<string, string>;
};

const DEFAULT_WIN_CANDIDATES = () => {
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
const DEFAULT_MAC_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
  '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
  '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
];
const DEFAULT_LINUX_CANDIDATES = [
  'google-chrome',
  'google-chrome-beta',
  'google-chrome-unstable',
  'chromium',
  'chromium-browser',
  'microsoft-edge',
  'microsoft-edge-beta',
  'microsoft-edge-dev',
  'msedge',
];

/**
 * Get the version of the Chrome/Chromium/Edge browser by executing the binary with `--version` and parsing the output.
 * @param chromeBinary
 * @param execFn
 * @returns
 */
export async function getBrowserVersion(
  chromeBinary?: string,
  execFn: ExecFn = exec,
): Promise<string> {
  let defaultCandidates: string[];
  if (process.platform === 'win32') {
    defaultCandidates = DEFAULT_WIN_CANDIDATES();
  } else if (process.platform === 'darwin') {
    defaultCandidates = DEFAULT_MAC_CANDIDATES;
  } else {
    // Linux and other Unixes
    defaultCandidates = DEFAULT_LINUX_CANDIDATES;
  }
  const candidates = chromeBinary ? [chromeBinary] : defaultCandidates;

  for (const binary of candidates) {
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
