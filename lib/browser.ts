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
      `${process.env.PROGRAMFILES}\\Chromium\\Application\\chrome.exe`,
      'msedge',
      `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ];
  } else if (process.platform === 'darwin') {
    defaultCandidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      'google-chrome',
      'chromium',
      'microsoft-edge',
    ];
  } else {
    // Linux and other Unixes
    defaultCandidates = [
      'google-chrome',
      'chromium',
      'chromium-browser',
      'microsoft-edge',
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
  throw new Error(`Could not determine Chrome version from candidates: ${candidates.join(', ')}`);
}
