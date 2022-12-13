import {BaseDriver} from 'appium/driver';

const CD_CONSTRAINTS = /** @type {const} */ ({
  chromedriverPort: {
    isNumber: true,
  }
});

/**
 * @typedef {typeof CD_CONSTRAINTS} CDConstraints
 */

/**
 * @extends {BaseDriver<CDConstraints>}
 * @implements {ExternalDriver<CDConstraints>}
 */
export class ChromeDriver extends BaseDriver {
  desiredCapConstraints = CD_CONSTRAINTS;
  _proxyActive = false;

  proxyActive() {
    return this._proxyActive;
  }

  canProxy() {
    return true;
  }

  /**
   *
   * @param {W3CChromeDriverCaps} jsonwpDesiredCapabilities
   * @param {W3CChromeDriverCaps} [jsonwpRequiredCaps]
   * @param {W3CChromeDriverCaps} [w3cCapabilities]
   * @param {import('@appium/types').DriverData[]} [otherSessionData]
   * @returns {Promise<[string,ChromeDriverCaps]>}
   */
  async createSession(
    jsonwpDesiredCapabilities,
    jsonwpRequiredCaps,
    w3cCapabilities,
    otherSessionData = []
  ) {
    const [sessionId, caps] = /** @type {[string, ChromeDriverCaps]} */(await super.createSession(jsonwpDesiredCapabilities, jsonwpRequiredCaps, w3cCapabilities));
    return [sessionId, caps];
  }
}

export default ChromeDriver;

/**
 * @typedef {import('./types').W3CChromeDriverCaps} W3CChromeDriverCaps
 * @typedef {import('./types').ChromeDriverCaps} ChromeDriverCaps
*/

/**
 * @template {import('@appium/types').Constraints} C
 * @typedef {import('@appium/types').ExternalDriver<C>} ExternalDriver
 */
