/**
 * A version parser for Microsoft Edge browser and MSEdgeDriver.
 */
export class Version {
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
