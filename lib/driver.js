import {BaseDriver} from 'appium/driver';
import Chromedriver from 'appium-chromedriver';

/**
 *
      host = DEFAULT_HOST,
      port = DEFAULT_PORT,
      useSystemExecutable = false,
      executable,
      executableDir = getChromedriverDir(),
      bundleId,
      mappingPath,
      cmdArgs,
      adb,
      verbose,
      logPath,
      disableBuildCheck,
      details,
      isAutodownloadEnabled = false,
      */

const CD_CONSTRAINTS = /** @type {const} */ ({
  chromedriverPort: { isNumber: true, },
  useSystemExecutable: { isBoolean: true, },
  executable: { isString: true, },
  executableDir: { isString: true },
  bundleId: { isString: true },
  verbose: { isBoolean: true },
  logPath: { isString: true },
  autodownloadEnabled: { isBoolean: true },
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

  /** @type {Chromedriver} */
  cd;

  proxyReqRes;
  proxyCommand;

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
   * @param {DriverData[]} [otherSessionData]
   * @returns {Promise<[string,ChromeDriverCaps]>}
   */
  async createSession(
    jsonwpDesiredCapabilities,
    jsonwpRequiredCaps,
    w3cCapabilities,
    otherSessionData = []
  ) {
    const [sessionId, caps] = /** @type {[string, ChromeDriverCaps]} */(await super.createSession(jsonwpDesiredCapabilities, jsonwpRequiredCaps, w3cCapabilities));
    await this.startChromedriverSession();
    return [sessionId, caps];
  }

  async startChromedriverSession() {
    const cdOpts = {...this.opts, isAutodownloadEnabled: this.opts.autodownloadEnabled};
    if (cdOpts.autodownloadEnabled) {
      delete cdOpts.autodownloadEnabled;
    }

    this.cd = new Chromedriver(cdOpts);
    this._proxyActive = true;
    this.proxyReqRes = this.cd.proxyReq.bind(this.cd);
    this.proxyCommand = this.cd.sendCommand.bind(this.cd);
  }

  /**
   *
   * @param {string} [sessionId]
   * @param {DriverData[]} [driverData]
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId, driverData) {
    await super.deleteSession(sessionId, driverData);
  }
}

export default ChromeDriver;

/**
 * @typedef {import('./types').W3CChromeDriverCaps} W3CChromeDriverCaps
 * @typedef {import('./types').ChromeDriverCaps} ChromeDriverCaps
 * @typedef {import('@appium/types').DriverData} DriverData
*/

/**
 * @template {import('@appium/types').Constraints} C
 * @typedef {import('@appium/types').ExternalDriver<C>} ExternalDriver
 */

/**
 * @template {import('@appium/types').Constraints} C
 * @typedef {import('@appium/types').DriverOpts<C>} DriverOpts
 */
