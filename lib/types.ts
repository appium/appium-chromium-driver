import type {DriverCaps, W3CDriverCaps} from '@appium/types';
import type {CDConstraints} from './desired-caps';
import type {ChromedriverOpts} from 'appium-chromedriver';

/**
 * W3C-style caps for {@link ChromiumDriver}
 * @public
 */
export type W3CChromiumDriverCaps = W3CDriverCaps<CDConstraints>;

/**
 * Capabilities for {@link ChromiumDriver}
 * @public
 */
export type ChromiumDriverCaps = DriverCaps<CDConstraints>;

/**
 * Browser information returned by `getBrowserInfo` method.
 * @public
 */
export type BrowserInfo = ChromedriverOpts['details'];
