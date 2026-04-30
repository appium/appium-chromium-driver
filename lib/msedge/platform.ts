export interface DriverPlatformConfig {
  archiveName: string;
  releaseChannel: 'WINDOWS' | 'MACOS' | 'LINUX';
}

/**
 * Get the platform-specific configuration for MSEdgeDriver.
 * @param platform The platform name.
 * @param arch The architecture name.
 * @returns The platform configuration.
 */
export function getPlatformConfig(
  platform = process.platform,
  arch = process.arch,
): DriverPlatformConfig {
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
 * Get driver executable name.
 * @returns The name of the driver executable.
 */
export function getDriverExecutableName(platform = process.platform): string {
  return platform === 'win32' ? 'msedgedriver.exe' : 'msedgedriver';
}
