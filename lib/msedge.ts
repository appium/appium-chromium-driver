import {fs, net, tempDir, zip} from '@appium/support';
import path from 'node:path';
import type {BrowserInfo} from './types';
import {strongbox} from '@appium/strongbox';

/**
 * Name for the strongbox storage for this driver.
 */
const LOCAL_PACKAGE_STORAGE_NAME = 'appium-chromium-driver';

const MSEDGEDRIVER_BASE_URL = 'https://msedgedriver.microsoft.com';
const UTF16LE_BOM = Buffer.from([0xff, 0xfe]);

type EdgeReleaseChannel = 'WINDOWS' | 'MACOS' | 'LINUX';

interface EdgePlatformConfig {
  archiveName: string;
  releaseChannel: EdgeReleaseChannel;
}

export function isMsEdge(browserName?: string): boolean {
  return /^(MicrosoftEdge|msedge)$/i.test(browserName ?? '');
}

/**
 * Get the expected name of the MSEdgeDriver executable for the current platform.
 * This is the binary name in the zip archive.
 * @returns The name of the MSEdgeDriver executable.
 */
export function getMsEdgeDriverExecutableName(): string {
  return process.platform === 'win32' ? 'msedgedriver.exe' : 'msedgedriver';
}

/**
 * Get the default directory for MSEdgeDriver executables.
 * This is a strongbox container named 'msedgedrivers' inside the package storage.
 * @returns
 */
export function getDefaultMsEdgeDriverDir(): string {
  const s = strongbox(LOCAL_PACKAGE_STORAGE_NAME, {
    suffix: 'msedgedrivers',
  });
  return s.container;
}

/**
 * Get the expected archive name and release channel for the current platform and architecture.
 * @param platform
 * @param arch
 * @returns
 */
export function getMsEdgePlatformConfig(
  platform = process.platform,
  arch = process.arch,
): EdgePlatformConfig {
  if (platform === 'win32') {
    if (arch === 'arm64') {
      return {archiveName: 'edgedriver_arm64.zip', releaseChannel: 'WINDOWS'};
    }
    if (arch === 'x64') {
      return {archiveName: 'edgedriver_win64.zip', releaseChannel: 'WINDOWS'};
    }
    return {archiveName: 'edgedriver_win32.zip', releaseChannel: 'WINDOWS'};
  }

  if (platform === 'darwin') {
    return {
      archiveName: arch === 'arm64' ? 'edgedriver_mac64_m1.zip' : 'edgedriver_mac64.zip',
      releaseChannel: 'MACOS',
    };
  }

  if (platform === 'linux') {
    return {archiveName: 'edgedriver_linux64.zip', releaseChannel: 'LINUX'};
  }

  throw new Error(`Unsupported platform for MSEdgeDriver autodownload: ${platform}`);
}

export async function findMsEdgeDriverExecutable(executableDir: string): Promise<string | null> {
  const candidates = await fs.glob(`**/${getMsEdgeDriverExecutableName()}`, {
    cwd: executableDir,
    absolute: true,
    nodir: true,
  });
  const [match] = candidates.sort((a, b) => a.length - b.length);
  return match ?? null;
}

export async function ensureMsEdgeDriver(
  browserVersion: string,
  executableDir: string,
): Promise<string> {
  const driverVersion = await getMsEdgeDriverVersion(browserVersion);
  const targetDir = path.join(executableDir, driverVersion);
  const targetExecutable = path.join(targetDir, getMsEdgeDriverExecutableName());

  // TODO: change to check the version instead of file existence.
  if (await fs.isExecutable(targetExecutable)) {
    return targetExecutable;
  }

  await fs.mkdirp(targetDir);
  const tmpRoot = await tempDir.openDir();
  const archivePath = path.join(tmpRoot, getMsEdgePlatformConfig().archiveName);
  try {
    await net.downloadFile(getMsEdgeDriverDownloadUrl(driverVersion), archivePath);
    await zip.extractAllTo(archivePath, targetDir);
    const extractedExecutable = await findMsEdgeDriverExecutable(targetDir);
    if (!extractedExecutable) {
      throw new Error(`Cannot find '${getMsEdgeDriverExecutableName()}' in '${targetDir}'`);
    }
    if (process.platform !== 'win32') {
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
 * Get the latest compatible MSEdgeDriver version for the given browser version.
 * @param browserVersion
 * @returns
 */
export async function getMsEdgeDriverVersion(browserVersion: string): Promise<string> {
  const majorVersion = getMajorVersion(browserVersion);
  const releaseUrl = `${MSEDGEDRIVER_BASE_URL}/LATEST_RELEASE_${majorVersion}_${getMsEdgePlatformConfig().releaseChannel}`;
  const response = await fetch(releaseUrl);
  if (!response.ok) {
    throw new Error(
      `Cannot retrieve MSEdgeDriver version for Edge '${browserVersion}' from '${releaseUrl}' ` +
        `(status ${response.status})`,
    );
  }
  const text = decodeMicrosoftVersionResponse(Buffer.from(await response.arrayBuffer()));
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(text)) {
    throw new Error(
      `Received an unexpected MSEdgeDriver version response from '${releaseUrl}': ${text}`,
    );
  }
  return text;
}

export function getMsEdgeDriverDownloadUrl(driverVersion: string): string {
  return `${MSEDGEDRIVER_BASE_URL}/${driverVersion}/${getMsEdgePlatformConfig().archiveName}`;
}

export function decodeMicrosoftVersionResponse(payload: Buffer): string {
  if (payload.subarray(0, UTF16LE_BOM.length).equals(UTF16LE_BOM)) {
    return payload.subarray(UTF16LE_BOM.length).toString('utf16le').trim();
  }
  return payload.toString('utf8').trim();
}

function getMajorVersion(browserVersion: string): string {
  const match = /^(\d+)/.exec(browserVersion);
  if (!match) {
    throw new Error(`Cannot determine major version from '${browserVersion}'`);
  }
  return match[1];
}

interface MsEdgeDriverResolveOpts {
  browserName?: string;
  executable?: string;
  executableDir?: string;
}

export async function resolveMsEdgeDriverExecutable(
  opts: MsEdgeDriverResolveOpts,
  browserVersionInfo?: BrowserInfo,
  isAutodownloadEnabled = true,
): Promise<string | undefined> {
  if (!isMsEdge(opts.browserName)) {
    return undefined;
  }

  if (opts.executable) {
    return opts.executable;
  }

  if (opts.executableDir) {
    const explicitExecutable = await findMsEdgeDriverExecutable(opts.executableDir);
    if (explicitExecutable) {
      return explicitExecutable;
    }
  }

  if (!isAutodownloadEnabled) {
    return undefined;
  }

  const browserVersion = browserVersionInfo?.info?.Browser;
  if (!browserVersion) {
    throw new Error(
      'Could not determine the installed Microsoft Edge version required for autodownload. ' +
        'Provide ms:edgeOptions.binary or appium:executable.',
    );
  }

  return await ensureMsEdgeDriver(
    browserVersion,
    opts.executableDir || getDefaultMsEdgeDriverDir(),
  );
}
