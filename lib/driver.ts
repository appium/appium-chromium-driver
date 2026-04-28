import type {
  DefaultCreateSessionResult,
  DriverData,
  ExternalDriver,
  HTTPMethod,
  InitialOpts,
  StringRecord,
} from '@appium/types';
import {BaseDriver, STANDARD_CAPS} from 'appium/driver';
import {Chromedriver, type ChromedriverOpts} from 'appium-chromedriver';
import {desiredCapConstraints, type CDConstraints} from './desired-caps';
import {getBrowserVersion} from './browser';
import {getDefaultMsEdgeDriverDir, isMsEdge, MsEdgeDriverHandler} from './msedge';
import type {W3CChromiumDriverCaps, ChromiumDriverCaps, BrowserInfo} from './types';
import path from 'node:path';

const STANDARD_CAPS_LOWER = new Set([...STANDARD_CAPS].map((cap) => cap.toLowerCase()));
const CHROME_VENDOR_PREFIX = 'goog:';
const EDGE_VENDOR_PREFIX = 'ms:';

export class ChromiumDriver
  extends BaseDriver<CDConstraints, StringRecord>
  implements ExternalDriver<CDConstraints, string, StringRecord>
{
  desiredCapConstraints = desiredCapConstraints;
  private _proxyActive = false;
  private _cd: Chromedriver | null = null;
  proxyReqRes: ((...args: any[]) => any) | null = null;
  proxyCommand?: <TReq = any, TRes = unknown>(
    url: string,
    method: HTTPMethod,
    body?: TReq,
  ) => Promise<TRes>;
  doesSupportBidi = true;
  private _bidiProxyUrl: string | null = null;

  constructor(opts: InitialOpts = {} as InitialOpts) {
    super(opts);
  }

  override proxyActive(): boolean {
    return this._proxyActive;
  }

  override canProxy(): boolean {
    return true;
  }

  get bidiProxyUrl(): string | null {
    return this._bidiProxyUrl;
  }

  get cd(): Chromedriver {
    if (!this._cd) {
      throw new Error('Chromedriver not started');
    }
    return this._cd;
  }

  /**
   * Exclude browser-specific capabilities (e.g. `goog:chromeOptions` and `ms:edgeOptions`)
   * from the capabilities to skip validation error for unrecognized capabilities.
   * @param caps
   * @returns
   */
  private excludeBrowserPrefixCaps(caps: Record<string, any>): Record<string, any> {
    const browserCapKeys = Object.keys(caps).filter(
      (key) =>
        key.startsWith(CHROME_VENDOR_PREFIX) || key.startsWith(EDGE_VENDOR_PREFIX),
    );
    return Object.keys(caps).reduce((acc, capName) => {
      if (!browserCapKeys.includes(capName)) {
        acc[capName] = caps[capName];
      }
      return acc;
    }, {} as Record<string, any>);
  }

  override validateDesiredCaps(caps: any): caps is ChromiumDriverCaps {
    return super.validateDesiredCaps(this.excludeBrowserPrefixCaps(caps));
  }

  override async createSession(
    jsonwpDesiredCapabilities: W3CChromiumDriverCaps,
    jsonwpRequiredCaps?: W3CChromiumDriverCaps,
    w3cCapabilities?: W3CChromiumDriverCaps,
    driverData?: DriverData[],
  ): Promise<DefaultCreateSessionResult<CDConstraints>> {
    const [sessionId] = await super.createSession(
      jsonwpDesiredCapabilities,
      jsonwpRequiredCaps,
      w3cCapabilities,
      driverData,
    );
    const returnedCaps = await this.startChromedriverSession();
    if (returnedCaps.webSocketUrl) {
      this._bidiProxyUrl = String(returnedCaps.webSocketUrl);
    }
    return [sessionId, returnedCaps];
  }

  private async getBrowserInfo(): Promise<BrowserInfo | undefined> {
    const browserBinary: string | undefined =
      (this.opts['goog:chromeOptions'] as Record<string, any>)?.binary ??
      (this.opts['ms:edgeOptions'] as Record<string, any>)?.binary;
    try {
      const bv = await getBrowserVersion(browserBinary, this.opts.browserName);
      this.log.info(`Detected browser version: ${bv}`);
      return {info: {Browser: bv}};
    } catch (err) {
      this.log.warn(`Failed to get browser version from binary: ${(err as Error).message}`);
    }
  }

  /**
   * FIXME: Please use this driver's local storage instead of the node_modules path
   * to avoid potential read-only issue.
   * Please update the `appium driver run chromium install-chromedriver` command behavior
   * also to reflect the change.
   * This change is a breaking change.
   */
  private getDefaultChromeDriverDir(): string {
    const pkgJson = require.resolve('appium-chromedriver/package.json');
    const packageDir = path.dirname(pkgJson);
    return path.join(packageDir, 'chromedriver');
  }

  private async getExecutable(
    browserVersionInfo?: BrowserInfo | undefined,
    isAutodownloadEnabled: boolean = true,
  ): Promise<string | undefined> {
    if (this.opts.executable) {
      return this.opts.executable;
    }

    if (!isMsEdge(this.opts.browserName)) {
      return undefined;
    }

    // medge case
    return await MsEdgeDriverHandler.resolveDriverExecutable(
      this.opts,
      browserVersionInfo,
      isAutodownloadEnabled,
    );
  }

  private getExecutableDir(): string | undefined {
    if (this.opts.executableDir) {
      return this.opts.executableDir;
    }

    return isMsEdge(this.opts.browserName)
      ? getDefaultMsEdgeDriverDir()
      : this.getDefaultChromeDriverDir();
  }

  async startChromedriverSession(): Promise<ChromiumDriverCaps> {
    const isAutodownloadEnabled = this.opts.autodownloadEnabled ?? true;
    const browserVersionInfo = await this.getBrowserInfo();
    const cdOpts: ChromedriverOpts = {
      port: this.opts.chromedriverPort?.toString(),
      useSystemExecutable: this.opts.useSystemExecutable,
      executable: await this.getExecutable(browserVersionInfo, isAutodownloadEnabled),
      executableDir: this.getExecutableDir(),
      verbose: this.opts.verbose,
      logPath: this.opts.logPath,
      disableBuildCheck: this.opts.disableBuildCheck,
      details: browserVersionInfo,
      isAutodownloadEnabled,
    };
    if (this.basePath) {
      cdOpts.reqBasePath = this.basePath;
    }
    this._cd = new Chromedriver(cdOpts);
    const cdStartRes = (await this._cd.start(this.getSessionCaps())) as ChromiumDriverCaps;
    this._proxyActive = true;
    this.proxyReqRes = this._cd.proxyReq.bind(this._cd);
    this.proxyCommand = this._cd.sendCommand.bind(this._cd);
    return cdStartRes;
  }

  override async deleteSession(sessionId?: string): Promise<void> {
    await super.deleteSession(sessionId);
    this._proxyActive = false;
    this._bidiProxyUrl = null;
    this.proxyReqRes = null;
    this.proxyCommand = undefined;
    if (this._cd) {
      await this._cd.stop();
      this._cd = null;
    }
  }

  private getSessionCaps(): StringRecord {
    return Object.keys(this.opts).reduce((acc, capName) => {
      if (
        STANDARD_CAPS_LOWER.has(capName.toLowerCase()) ||
        capName.startsWith(CHROME_VENDOR_PREFIX) ||
        capName.startsWith(EDGE_VENDOR_PREFIX)
      ) {
        acc[capName] = this.opts[capName];
      }
      return acc;
    }, {} as StringRecord);
  }
}

export default ChromiumDriver;
