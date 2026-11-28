export type ReleaseChannel = 'WINDOWS' | 'MACOS' | 'LINUX';

const RELEASE_CHANNELS: Partial<Record<NodeJS.Platform, ReleaseChannel>> = {
  win32: 'WINDOWS',
  darwin: 'MACOS',
  linux: 'LINUX',
};

/**
 * Get the MSEdgeDriver release channel of the platform.
 * @param platform The platform name.
 * @returns The release channel.
 */
export function getReleaseChannel(platform = process.platform): ReleaseChannel {
  const channel = RELEASE_CHANNELS[platform];
  if (!channel) {
    throw new Error(`Unsupported platform for MSEdgeDriver autodownload: ${platform}`);
  }
  return channel;
}

/**
 * Get driver executable name.
 * @returns The name of the driver executable.
 */
export function getDriverExecutableName(platform = process.platform): string {
  return platform === 'win32' ? 'msedgedriver.exe' : 'msedgedriver';
}
