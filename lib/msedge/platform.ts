/**
 * Get driver executable name.
 * @returns The name of the driver executable.
 */
export function getDriverExecutableName(platform = process.platform): string {
  return platform === 'win32' ? 'msedgedriver.exe' : 'msedgedriver';
}
