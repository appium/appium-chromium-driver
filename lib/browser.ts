import {exec} from 'teen_process';

type ExecFn = (binary: string, args: string[]) => Promise<{stdout: string}>;

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
    defaultCandidates = [
      'chrome',
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Google\\Chrome Beta\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome Beta\\Application\\chrome.exe`,
      `${process.env.LOCALAPPDATA}\\Google\\Chrome Beta\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Google\\Chrome Dev\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome Dev\\Application\\chrome.exe`,
      `${process.env.LOCALAPPDATA}\\Google\\Chrome Dev\\Application\\chrome.exe`,
      `${process.env.PROGRAMFILES}\\Chromium\\Application\\chrome.exe`,
      'msedge',
      `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env.PROGRAMFILES}\\Microsoft\\Edge Beta\\Application\\msedge.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge Beta\\Application\\msedge.exe`,
      `${process.env.LOCALAPPDATA}\\Microsoft\\Edge Beta\\Application\\msedge.exe`,
      `${process.env.PROGRAMFILES}\\Microsoft\\Edge Dev\\Application\\msedge.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge Dev\\Application\\msedge.exe`,
      `${process.env.LOCALAPPDATA}\\Microsoft\\Edge Dev\\Application\\msedge.exe`,
    ];
  } else if (process.platform === 'darwin') {
    defaultCandidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
      '/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Microsoft Edge Beta.app/Contents/MacOS/Microsoft Edge Beta',
      '/Applications/Microsoft Edge Dev.app/Contents/MacOS/Microsoft Edge Dev',
    ];
  } else {
    // Linux and other Unixes
    defaultCandidates = [
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
