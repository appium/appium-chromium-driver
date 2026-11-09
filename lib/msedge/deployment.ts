import path from 'node:path';

import {fs} from 'appium/support.js';

import {support} from '../utils/support.js';
import {Version} from './version.js';

interface DriverDeploymentArtifact {
  archiveName: string;
  executableName: string;
  version: string;
}

/**
 * Deploy a downloaded driver artifact into the target executable directory.
 * @param artifact Driver artifact metadata needed for deployment.
 * @param executableDir The base directory where versioned driver folders are stored.
 * @param downloadArchive Callback responsible for obtaining the archive file at the provided path.
 * @returns The deployed driver executable path.
 * @throws Error if deployment fails.
 */
export async function deployDriverArtifact(
  artifact: DriverDeploymentArtifact,
  executableDir: string,
  downloadArchive: (archivePath: string) => Promise<void>,
): Promise<string> {
  const targetDir = path.join(executableDir, artifact.version);
  const targetExecutable = path.join(targetDir, artifact.executableName);

  if (await fs.isExecutable(targetExecutable)) {
    return targetExecutable;
  }

  await fs.mkdirp(targetDir);
  const tmpRoot = await support.openTempDir();
  const archivePath = path.join(tmpRoot, artifact.archiveName);
  try {
    await downloadArchive(archivePath);
    await support.extractAllTo(archivePath, targetDir);
    const extractedExecutable = await locateDriverExecutableInDir(targetDir, artifact.executableName);
    if (!extractedExecutable) {
      throw new Error(`Cannot find '${artifact.executableName}' in '${targetDir}'`);
    }
    if (process.platform !== 'win32') {
      // This might not be necessary, but to be safe.
      await fs.chmod(extractedExecutable, 0o755);
    }
    if (extractedExecutable !== targetExecutable) {
      await fs.mv(extractedExecutable, targetExecutable, {mkdirp: true, clobber: true});
    }
    return targetExecutable;
  } finally {
    await fs.rimraf(tmpRoot);
  }
}

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

/** Find a compatible executable in the versioned cache created by deployDriverArtifact. */
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
