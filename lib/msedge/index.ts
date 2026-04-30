import type {BrowserInfo} from '../types';
import {deployDriverArtifact, locateDriverExecutableInDir} from './deployment';
import {isMsEdge} from './browser-identity';
import {detectBrowserVersion, listBrowserBinaryCandidates} from './browser-candidates';
import {fetchDriverArchive, resolveDriverVersionForBrowser} from './download';
import {getDriverExecutableName, getPlatformConfig} from './platform';
import {getDefaultDriverDir} from './storage';
import {Version} from './version';

interface DriverResolveOpts {
  browserName?: string;
  executable?: string;
  executableDir?: string;
}

/**
 * Determine the MSEdgeDriver executable path for the current session request.
 * It returns opts.executable if it is provided.
 * If not, it checks whether the browser is Microsoft Edge and returns undefined for non-Edge sessions.
 * For Edge sessions it prefers an existing executable from opts.executableDir, then falls back to
 * resolving, downloading, and deploying a compatible driver artifact when autodownload is enabled.
 * If any step fails for a Microsoft Edge session, it throws an error.
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
    const explicitExecutable = await locateDriverExecutableInDir(opts.executableDir, executableName);
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
    const driverVersion = await resolveDriverVersionForBrowser(browserVersion);
    const artifact = {
      archiveName: getPlatformConfig().archiveName,
      executableName,
      version: driverVersion.toString(),
    };
    return await deployDriverArtifact(artifact, executableDir, async (archivePath) => {
      await fetchDriverArchive(driverVersion, archivePath);
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
  detectBrowserVersion as discoverMsEdgeBrowserVersion,
  listBrowserBinaryCandidates as getMsEdgeBrowserCandidates,
  resolveDriverExecutable as determineDriverExecutable,
  resolveDriverExecutable as resolveMsEdgeDriverExecutable,
  getDefaultDriverDir as getDefaultMsEdgeDriverDir,
};
