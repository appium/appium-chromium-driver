import type {BrowserInfo} from '../types';
import {ensureDriver, findDriverExecutable} from './deployment';
import {isMsEdge} from './browser-identity';
import {discoverBrowserVersion, getBrowserCandidates} from './browser-candidates';
import {downloadDriverArchive, getDriverVersion} from './download';
import {getDriverExecutableName, getPlatformConfig} from './platform';
import {getDefaultDriverDir} from './storage';
import {Version} from './version';

interface DriverResolveOpts {
  browserName?: string;
  executable?: string;
  executableDir?: string;
}

/**
 * Resolve the MSEdgeDriver executable path.
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
export async function resolveDriverExecutable(
  opts: DriverResolveOpts,
  browserVersionInfo?: BrowserInfo,
  isAutodownloadEnabled = true,
): Promise<string | undefined> {
  if (opts.executable) {
    return opts.executable;
  }

  if (!isMsEdge(opts.browserName)) {
    return undefined;
  }

  const executableName = getDriverExecutableName();
  if (opts.executableDir) {
    const explicitExecutable = await findDriverExecutable(opts.executableDir, executableName);
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
  const executableDir = opts.executableDir || getDefaultDriverDir();
  try {
    const driverVersion = await getDriverVersion(browserVersion);
    const artifact = {
      archiveName: getPlatformConfig().archiveName,
      executableName,
      version: driverVersion.toString(),
    };
    return await ensureDriver(artifact, executableDir, async (archivePath) => {
      await downloadDriverArchive(driverVersion, archivePath);
    });
  } catch (err) {
    throw new Error(
      `Failed to resolve MSEdgeDriver executable for Edge version '${browserVersion}' ` +
        `in '${executableDir}': ${(err as Error).message}`,
    );
  }
}

export {getDefaultDriverDir, isMsEdge};
export {
  discoverBrowserVersion as discoverMsEdgeBrowserVersion,
  getBrowserCandidates as getMsEdgeBrowserCandidates,
  resolveDriverExecutable as resolveMsEdgeDriverExecutable,
  getDefaultDriverDir as getDefaultMsEdgeDriverDir,
};
