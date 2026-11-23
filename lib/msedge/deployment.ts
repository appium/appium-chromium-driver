import path from 'node:path';

import {fs} from 'appium/support.js';

import {Version} from './version.js';

/**
 * Locate the driver executable in the given directory tree.
 * @param executableDir The directory to search for the driver executable.
 * @param executableName The driver executable file name.
 * @returns The path to the driver executable, or null if not found.
 */
export async function locateDriverExecutableInDir(
  executableDir: string,
  executableName: string,
): Promise<string | null> {
  // TODO: change to check the version instead of file existence as a followup.
  // https://github.com/appium/appium-chromium-driver/issues/423
  const candidates = await fs.glob(`**/${executableName}`, {
    cwd: executableDir,
    absolute: true,
  });
  const files = await filterFiles(candidates);
  const [match] = files.sort((a, b) => a.length - b.length);
  return match ?? null;
}

/** Drop paths that are not regular files (e.g. a directory named like the executable). */
async function filterFiles(paths: string[]): Promise<string[]> {
  const flags = await Promise.all(paths.map(async (p) => (await fs.stat(p).catch(() => null))?.isFile()));
  return paths.filter((_, i) => flags[i]);
}

/** Find a compatible executable in the versioned cache. */
export async function locateCachedDriverExecutable(
  executableDir: string,
  executableName: string,
  browserVersion: Version,
): Promise<string | null> {
  const candidates = await fs.glob(`*/${executableName}`, {
    cwd: executableDir,
    absolute: true,
  });
  // Edge requires the first three version components to match. The directory name
  // records the downloaded version; prefer the newest compatible patch.
  const compatible = (await filterFiles(candidates))
    .flatMap((executable) => {
      const version = Version.tryFrom(path.basename(path.dirname(executable)));
      return version?.isCompatibleWith(browserVersion) ? [{executable, version}] : [];
    })
    .sort((a, b) => b.version.patch - a.version.patch);
  for (const {executable} of compatible) {
    if (await fs.isExecutable(executable)) {
      return executable;
    }
  }
  return null;
}
