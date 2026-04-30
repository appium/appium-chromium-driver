import {fs, net, tempDir, zip} from '@appium/support';
import path from 'node:path';
import type {BrowserInfo} from './types';
import {strongbox} from '@appium/strongbox';

/**
 * Name for the strongbox storage for this driver.
 * Note: Changing this name will be a breaking change.
 */
const LOCAL_PACKAGE_STORAGE_NAME = 'appium-chromium-driver';

interface MsEdgeDriverPlatformConfig {
  archiveName: string;
  releaseChannel: 'WINDOWS' | 'MACOS' | 'LINUX';
}

interface MsEdgeDriverResolveOpts {
  browserName?: string;
  executable?: string;
  executableDir?: string;
}

/**
 * A version parser for Microsoft Edge browser and MSEdgeDriver.
 */
class Version {
  // The version format is expected to be like "147.0.3179.73" or "147.0.3179.98".
  private static readonly VERSION_PATTERN = /^(\d+)\.\d+\.\d+\.\d+$/;

  constructor(
    private readonly rawVersion: string,
    /**
     * The major version number extracted from the raw version string.
     * Most of cases the major version is sufficient to determine
     * the compatible MSEdgeDriver version, so we extract it for convenience.
     */
    readonly major: string,
  ) {}

  /**
   * Parse a version string into a Version instance.
   * @param version The version string (e.g., "147.0.3179.73" or "147.0.3179.98").
   * @returns A Version instance.
   * @throws Error if the version string is invalid.
   */
  static from(version: string): Version {
    const match = this.VERSION_PATTERN.exec(version);
    if (!match) {
      throw new Error(
        `Invalid version format: '${version}'. Please report it to the Appium team as it might be a new version format.`,
      );
    }
    return new Version(version, match[1]);
  }

  /**
   * Return the original version string.
   * @returns The original version string.
   */
  toString(): string {
    return this.rawVersion;
  }
}

/**
 * Handles MSEdgeDriver discovery and autodownload flows.
 */
export class MsEdgeDriverHandler {
  private static readonly MSEDGEDRIVER_BASE_URL = 'https://msedgedriver.microsoft.com';
  private static readonly MSEDGEDRIVER_REQUEST_TIMEOUT_MS = 10_000;
  private static readonly UTF16LE_BOM = Buffer.from([0xff, 0xfe]);

  /**
   * Get driver executable name.
   * @returns The name of the driver executable.
   */
  private static get driverExecutableName(): string {
    return process.platform === 'win32' ? 'msedgedriver.exe' : 'msedgedriver';
  }

  /**
   * Resolve the MSEdgeDriver executable path based on the given options and browser version info.
   * It returns opts.executable if it is provided.
   * If not, it checks if the browser is Microsoft Edge. If it is not, it returns undefined.
   * If it is, it tries to find the executable in opts.executableDir if provided.
   * If it cannot find it and autodownload is enabled, it tries to autodownload the driver based on the browser version.
   * If any step fails for Microsoft Edge, it throws an error.
   * @param opts The options for resolving the driver executable.
   * @param browserVersionInfo The information about the browser version.
   * @param isAutodownloadEnabled Whether autodownload is enabled (default: true).
   * @returns The path to the driver executable, or undefined if it cannot be resolved.
   * @throws Error if the browser is Microsoft Edge but the executable cannot be resolved.
   */
  static async resolveDriverExecutable(
    opts: MsEdgeDriverResolveOpts,
    browserVersionInfo?: BrowserInfo,
    isAutodownloadEnabled = true,
  ): Promise<string | undefined> {
    if (opts.executable) {
      return opts.executable;
    }

    if (!isMsEdge(opts.browserName)) {
      return undefined;
    }

    if (opts.executableDir) {
      const explicitExecutable = await MsEdgeDriverHandler.findDriverExecutable(opts.executableDir);
      if (explicitExecutable) {
        return explicitExecutable;
      }
    }

    if (!isAutodownloadEnabled) {
      return undefined;
    }

    const browserVersionStr = browserVersionInfo?.info?.Browser;
    if (!browserVersionStr) {
      throw new Error(
        'Could not determine the installed Microsoft Edge version required for autodownload. ' +
          'Provide ms:edgeOptions.binary or appium:executable.',
      );
    }

    const browserVersion = Version.from(browserVersionStr);
    const executableDir = opts.executableDir || getDefaultMsEdgeDriverDir();
    try {
      return await MsEdgeDriverHandler.ensureDriver(browserVersion, executableDir);
    } catch (err) {
      throw new Error(
        `Failed to resolve MSEdgeDriver executable for Edge version '${browserVersion}' ` +
          `in '${executableDir}': ${(err as Error).message}`,
      );
    }
  }

  /**
   * Get the platform-specific configuration for MSEdgeDriver.
   * @param platform The platform name.
   * @param arch The architecture name.
   * @returns The platform configuration.
   */
  private static getPlatformConfig(
    platform = process.platform,
    arch = process.arch,
  ): MsEdgeDriverPlatformConfig {
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

  /**
   * Find the driver executable in the given directory.
   * @param executableDir The directory to search for the driver executable.
   * @returns The path to the driver executable, or null if not found.
   */
  private static async findDriverExecutable(executableDir: string): Promise<string | null> {
    // TODO: change to check the version instead of file existence as a followup.
    // https://github.com/appium/appium-chromium-driver/issues/423
    const candidates = await fs.glob(`**/${MsEdgeDriverHandler.driverExecutableName}`, {
      cwd: executableDir,
      absolute: true,
      nodir: true,
    });
    const [match] = candidates.sort((a, b) => a.length - b.length);
    return match ?? null;
  }

  /**
   * Ensure the driver executable is available.
   * @param browserVersion The version of the browser.
   * @param executableDir The directory to store the driver executable.
   * @returns The path to the driver executable.
   * @throws Error if the driver cannot be ensured.
   */
  private static async ensureDriver(
    browserVersion: Version,
    executableDir: string,
  ): Promise<string> {
    const driverVersion = await MsEdgeDriverHandler.getDriverVersion(browserVersion);
    const targetDir = path.join(executableDir, driverVersion.toString());
    const targetExecutable = path.join(targetDir, MsEdgeDriverHandler.driverExecutableName);

    if (await fs.isExecutable(targetExecutable)) {
      return targetExecutable;
    }

    await fs.mkdirp(targetDir);
    const tmpRoot = await tempDir.openDir();
    const archivePath = path.join(tmpRoot, MsEdgeDriverHandler.getPlatformConfig().archiveName);
    try {
      await net.downloadFile(MsEdgeDriverHandler.getDriverDownloadUrl(driverVersion), archivePath);
      await zip.extractAllTo(archivePath, targetDir);
      const extractedExecutable = await MsEdgeDriverHandler.findDriverExecutable(targetDir);
      if (!extractedExecutable) {
        throw new Error(
          `Cannot find '${MsEdgeDriverHandler.driverExecutableName}' in '${targetDir}'`,
        );
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

  private static getLatestReleaseUrl(browserVersion: Version): string {
    const majorVersion = browserVersion.major;
    const {releaseChannel} = MsEdgeDriverHandler.getPlatformConfig();
    return `${MsEdgeDriverHandler.MSEDGEDRIVER_BASE_URL}/LATEST_RELEASE_${majorVersion}_${releaseChannel}`;
  }

  private static getDriverDownloadUrl(driverVersion: Version): string {
    return `${MsEdgeDriverHandler.MSEDGEDRIVER_BASE_URL}/${driverVersion}/${MsEdgeDriverHandler.getPlatformConfig().archiveName}`;
  }

  /**
   * Get the version of the MSEdgeDriver for the given browser version
   * from the official Microsoft Edge Driver service.
   * @param browserVersion The version of the browser.
   * @returns The version of the MSEdgeDriver.
   */
  private static async getDriverVersion(browserVersion: Version): Promise<Version> {
    const releaseUrl = MsEdgeDriverHandler.getLatestReleaseUrl(browserVersion);
    const response = await fetch(releaseUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(MsEdgeDriverHandler.MSEDGEDRIVER_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(
        `Cannot retrieve MSEdgeDriver version for Edge '${browserVersion}' from '${releaseUrl}' ` +
          `(status ${response.status})`,
      );
    }
    // The response body is expected to be a small and simple text with the version string, e.g., "147.0.3179.98".
    const text = MsEdgeDriverHandler.decodeVersionResponse(
      Buffer.from(await response.arrayBuffer()),
    );
    return Version.from(text);
  }

  private static decodeVersionResponse(payload: Buffer): string {
    if (
      payload
        .subarray(0, MsEdgeDriverHandler.UTF16LE_BOM.length)
        .equals(MsEdgeDriverHandler.UTF16LE_BOM)
    ) {
      return payload.subarray(MsEdgeDriverHandler.UTF16LE_BOM.length).toString('utf16le').trim();
    }
    return payload.toString('utf8').trim();
  }
}

/**
 * Determine if the given browser name corresponds to Microsoft Edge.
 * 'MicrosoftEdge' is old format. Newer MSEdge accepts 'msedge' only as the browser name.
 * @param browserName The name of the browser.
 * @returns True if the browser is Microsoft Edge, false otherwise.
 */
export function isMsEdge(browserName?: string): boolean {
  return /^(MicrosoftEdge|msedge)$/i.test(browserName ?? '');
}

/**
 * Get the default directory for storing MSEdgeDriver executables.
 * @returns The default directory path.
 */
export function getDefaultMsEdgeDriverDir(): string {
  const s = strongbox(LOCAL_PACKAGE_STORAGE_NAME, {
    suffix: 'msedgedrivers',
  });
  return s.container;
}
