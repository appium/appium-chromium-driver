import {strongbox} from '@appium/strongbox';

/**
 * Name for the strongbox storage for this driver.
 * Note: Changing this name will be a breaking change.
 */
const LOCAL_PACKAGE_STORAGE_NAME = 'appium-chromium-driver';

/**
 * Get the default directory for storing MSEdgeDriver executables.
 * @returns The default directory path.
 */
export function getDefaultDriverDir(): string {
  const s = strongbox(LOCAL_PACKAGE_STORAGE_NAME, {
    suffix: 'msedgedrivers',
  });
  return s.container;
}

export {getDefaultDriverDir as getDefaultMsEdgeDriverDir};
