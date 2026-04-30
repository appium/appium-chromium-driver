import {fs, tempDir, zip} from 'appium/support';
import path from 'node:path';

interface DriverDeploymentArtifact {
  archiveName: string;
  executableName: string;
  version: string;
}

/**
 * Ensure the driver executable is available.
 * @param artifact Driver artifact metadata needed for deployment.
 * @param executableDir The directory to store the driver executable.
 * @returns The path to the driver executable.
 * @throws Error if the driver cannot be ensured.
 */
export async function ensureDriver(
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
  const tmpRoot = await tempDir.openDir();
  const archivePath = path.join(tmpRoot, artifact.archiveName);
  try {
    await downloadArchive(archivePath);
    await zip.extractAllTo(archivePath, targetDir);
    const extractedExecutable = await findDriverExecutable(targetDir, artifact.executableName);
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
 * Find the driver executable in the given directory.
 * @param executableDir The directory to search for the driver executable.
 * @param executableName The driver executable file name.
 * @returns The path to the driver executable, or null if not found.
 */
export async function findDriverExecutable(
  executableDir: string,
  executableName: string,
): Promise<string | null> {
  // TODO: change to check the version instead of file existence as a followup.
  // https://github.com/appium/appium-chromium-driver/issues/423
  const candidates = await fs.glob(`**/${executableName}`, {
    cwd: executableDir,
    absolute: true,
    nodir: true,
  });
  const [match] = candidates.sort((a, b) => a.length - b.length);
  return match ?? null;
}
