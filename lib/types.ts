import type {DriverCaps, W3CDriverCaps} from '@appium/types';
import type {CDConstraints} from './driver';

/**
 * W3C-style caps for {@link ChromeDriver}
 * @public
 */
export type W3CChromeDriverCaps = W3CDriverCaps<CDConstraints>;

/**
 * Capabilities for {@link ChromeDriver}
 * @public
 */
export type ChromeDriverCaps = DriverCaps<CDConstraints>;
