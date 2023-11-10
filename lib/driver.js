import _ from 'lodash';
import {BaseDriver, STANDARD_CAPS} from 'appium/driver';
import Chromedriver from 'appium-chromedriver';

const CD_CONSTRAINTS = /** @type {const} */ ({
  chromedriverPort: { isNumber: true, },
  useSystemExecutable: { isBoolean: true, },
  executable: { isString: true, },
  executableDir: { isString: true },
  verbose: { isBoolean: true },
  logPath: { isString: true },
  autodownloadEnabled: { isBoolean: true },
  disableBuildCheck: { isBoolean: true },
  browserName: { isString: true },
});

const STANDARD_CAPS_LOWER = new Set([...STANDARD_CAPS].map((cap) => cap.toLowerCase()));
const CHROME_VENDOR_PREFIX = 'goog:';
const EDGE_VENDOR_PREFIX = 'ms:';


/**
 * @extends {BaseDriver<CDConstraints>}
 * @implements {ExternalDriver<CDConstraints>}
 */
// @ts-ignore
export class ChromiumDriver extends BaseDriver {
  desiredCapConstraints = CD_CONSTRAINTS;
  _proxyActive = false;

  /** @type {Chromedriver|null} */
  cd;

  /** @type {DriverOpts<CDConstraints>} */
  // @ts-ignore
  opts;

  proxyReqRes;
  proxyCommand;

  doesSupportBidi = true;

  /** @type {string|null} */
  _bidiProxyUrl = null;

  proxyActive() {
    return this._proxyActive;
  }

  canProxy() {
    return true;
  }

  get bidiProxyUrl() {
    return this._bidiProxyUrl;
  }


  /**
   *
   * @param {W3CChromiumDriverCaps} jsonwpDesiredCapabilities
   * @param {W3CChromiumDriverCaps} [jsonwpRequiredCaps]
   * @param {W3CChromiumDriverCaps} [w3cCapabilities]
   * @returns {Promise<[string,ChromiumDriverCaps]>}
   */
  // @ts-ignore
  async createSession(
    jsonwpDesiredCapabilities,
    jsonwpRequiredCaps,
    w3cCapabilities,
  ) {
    const [sessionId,] = /** @type {[string, ChromiumDriverCaps]} */(await super.createSession(jsonwpDesiredCapabilities, jsonwpRequiredCaps, w3cCapabilities));
    const returnedCaps = await this.startChromedriverSession();
    if (returnedCaps.webSocketUrl) {
      this._bidiProxyUrl = (/** @type {string|null} */(/** @type {unknown} */(returnedCaps.webSocketUrl)));
    }
    return [sessionId, returnedCaps];
  }

  getSessionCaps() {
    return Object.keys(this.opts).reduce((acc, capName) => {
      if (STANDARD_CAPS_LOWER.has(capName.toLowerCase()) || capName.startsWith(CHROME_VENDOR_PREFIX) || capName.startsWith(EDGE_VENDOR_PREFIX)) {
        acc[capName] = this.opts[capName];
      }
      return acc;
    }, {});
  }

  async startChromedriverSession() {
    const isAutodownloadEnabled = _.isUndefined(this.opts.autodownloadEnabled) ?
      true : this.opts.autodownloadEnabled;
    const cdOpts = {
      port: this.opts.chromedriverPort,
      useSystemExecutable: this.opts.useSystemExecutable,
      executable: this.opts.executable,
      executableDir: this.opts.executableDir,
      verbose: this.opts.verbose,
      logPath: this.opts.logPath,
      disableBuildCheck: this.opts.disableBuildCheck,
      isAutodownloadEnabled,
    };

    this.cd = new Chromedriver(cdOpts);
    const cdStartRes = /** @type {ChromiumDriverCaps} */(await this.cd.start(this.getSessionCaps()));
    this._proxyActive = true;
    this.proxyReqRes = this.cd.proxyReq.bind(this.cd);
    this.proxyCommand = this.cd.sendCommand.bind(this.cd);
    return cdStartRes;
  }

  /**
   *
   * @param {string} [sessionId]
   * @param {DriverData[]} [driverData]
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId, driverData) {
    // @ts-ignore
    await super.deleteSession(sessionId, driverData);
    this._proxyActive = false;
    this._bidiProxyUrl = null;
    this.proxyReqRes = null;
    this.proxyCommand = null;
    if (this.cd) {
      await this.cd.stop();
      this.cd = null;
    }
  }
}

export default ChromiumDriver;

/**
 * @typedef {typeof CD_CONSTRAINTS} CDConstraints
 */

/**
 * @typedef {import('./types').W3CChromiumDriverCaps} W3CChromiumDriverCaps
 * @typedef {import('./types').ChromiumDriverCaps} ChromiumDriverCaps
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
