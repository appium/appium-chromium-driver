import {strongbox} from '@appium/strongbox';

/**
 * Name for the strongbox storage for this driver.
 * Note: Changing this name will be a breaking change.
 */
export const LOCAL_PACKAGE_STORAGE_NAME = 'appium-chromium-driver';

/**
 * Get the default directory for storing Chromedriver executables.
 * @returns The default directory path.
 */
export function getDefaultChromeDriverDir(): string {
  return strongbox(LOCAL_PACKAGE_STORAGE_NAME, {
    suffix: 'chromedrivers',
  }).container;
}

/**
 * Get the default directory for storing MSEdgeDriver executables.
 * @returns The default directory path.
 */
export function getDefaultMsEdgeDriverDir(): string {
  return strongbox(LOCAL_PACKAGE_STORAGE_NAME, {
    suffix: 'msedgedrivers',
  }).container;
}
