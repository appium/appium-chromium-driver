import {net} from 'appium/support';
import {getPlatformConfig} from './platform';
import {Version} from './version';

const DRIVER_STORAGE_BASE_URL = 'https://msedgedriver.microsoft.com';
const STORAGE_REQUEST_TIMEOUT_MS = 10_000;
const UTF16LE_BOM = Buffer.from([0xff, 0xfe]);

/**
 * Resolve the compatible MSEdgeDriver version for a given browser version
 * via the official Microsoft Edge Driver service.
 * @param browserVersion The version of the browser.
 * @returns The version of the MSEdgeDriver.
 */
export async function resolveDriverVersionForBrowser(browserVersion: Version): Promise<Version> {
  const releaseUrl = getLatestReleaseUrl(browserVersion);
  const response = await fetch(releaseUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(STORAGE_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      `Cannot retrieve MSEdgeDriver version for Edge '${browserVersion}' from '${releaseUrl}' ` +
        `(status ${response.status})`,
    );
  }

  // The response body is expected to be a small and simple text with the version string, e.g., "147.0.3179.98".
  const text = decodeVersionResponse(Buffer.from(await response.arrayBuffer()));
  return Version.from(text);
}

/**
 * Fetch the MSEdgeDriver archive for the given driver version.
 * @param driverVersion The MSEdgeDriver version to download.
 * @param archivePath The local path where the archive should be written.
 */
export async function fetchDriverArchive(
  driverVersion: Version,
  archivePath: string,
): Promise<void> {
  await net.downloadFile(getDriverDownloadUrl(driverVersion), archivePath);
}

function getLatestReleaseUrl(browserVersion: Version): string {
  const {releaseChannel} = getPlatformConfig();
  return `${DRIVER_STORAGE_BASE_URL}/LATEST_RELEASE_${browserVersion.major}_${releaseChannel}`;
}

function getDriverDownloadUrl(driverVersion: Version): string {
  return `${DRIVER_STORAGE_BASE_URL}/${driverVersion}/${getPlatformConfig().archiveName}`;
}

function decodeVersionResponse(payload: Buffer): string {
  if (payload.subarray(0, UTF16LE_BOM.length).equals(UTF16LE_BOM)) {
    return payload.subarray(UTF16LE_BOM.length).toString('utf16le').trim();
  }
  return payload.toString('utf8').trim();
}
