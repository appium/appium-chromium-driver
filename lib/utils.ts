import path from 'node:path';
import {exec} from 'teen_process';

/**
 * Build Windows executable candidate paths from common installation base folders.
 * @param subdirs Relative installation subdirectories.
 * @param exe Executable file name.
 * @returns Absolute candidate executable paths.
 */
export function getWindowsExecutableCandidates(subdirs: string[], exe: string): string[] {
  const bases = [
    process.env.PROGRAMFILES,
    process.env['PROGRAMFILES(X86)'],
    process.env.LOCALAPPDATA,
  ];
  return bases
    .filter((base): base is string => Boolean(base))
    .flatMap((base) => subdirs.map((sub) => path.join(base, sub, exe)));
}

/**
 * Read browser version from the given executable path or command.
 * @param binary Browser executable path or command.
 * @returns Browser version if detected, otherwise null.
 */
export async function readBrowserVersion(binary: string): Promise<string | null> {
  return process.platform === 'win32'
    ? await readBrowserVersionWin(binary)
    : await readBrowserVersionUnix(binary);
}

/**
 * On Windows, retrieve the browser version via PowerShell's VersionInfo instead of --version,
 * because Chrome/Edge do not reliably write to stdout when spawned via exec.
 */
async function readBrowserVersionWin(binaryPath: string): Promise<string | null> {
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
async function readBrowserVersionUnix(binary: string): Promise<string | null> {
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
