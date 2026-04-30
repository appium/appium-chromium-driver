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
import {discoverChromeBrowserVersion} from './chrome';
import {desiredCapConstraints, type CDConstraints} from './desired-caps';
import * as msedge from './msedge/index';
import type {W3CChromiumDriverCaps, ChromiumDriverCaps, BrowserInfo} from './types';
import path from 'node:path';

const STANDARD_CAPS_LOWER = new Set([...STANDARD_CAPS].map((cap) => cap.toLowerCase()));
const CHROME_VENDOR_PREFIX = 'goog:';
const EDGE_VENDOR_PREFIX = 'ms:';

interface BrowserDriverStrategy {
  discoverBrowserVersion(browserBinary?: string): Promise<string>;
  resolveExecutable(
    browserVersionInfo: BrowserInfo | undefined,
    isAutodownloadEnabled: boolean,
  ): Promise<string | undefined>;
  getDefaultExecutableDir(): string;
}

export class ChromiumDriver
  extends BaseDriver<CDConstraints, StringRecord>
  implements ExternalDriver<CDConstraints, string, StringRecord>
{
  desiredCapConstraints = desiredCapConstraints;
  proxyReqRes: ((...args: any[]) => any) | null = null;
  proxyCommand?: <TReq = any, TRes = unknown>(
    url: string,
    method: HTTPMethod,
    body?: TReq,
  ) => Promise<TRes>;
  doesSupportBidi = true;
  private _proxyActive = false;
  private _cd: Chromedriver | null = null;
  private _bidiProxyUrl: string | null = null;

  constructor(opts: InitialOpts = {} as InitialOpts) {
    super(opts);
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

  override proxyActive(): boolean {
    return this._proxyActive;
  }

  override canProxy(): boolean {
    return true;
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
    try {
      await super.deleteSession(sessionId);
    } finally {
      this._proxyActive = false;
      this._bidiProxyUrl = null;
      this.proxyReqRes = null;
      this.proxyCommand = undefined;
      if (this._cd) {
        try {
          await this._cd.stop();
        } catch (err) {
          this.log.warn(`Failed to stop Chromedriver: ${(err as Error).message}`);
        }
        this._cd = null;
      }
    }
  }

  /**
   * Exclude browser-specific capabilities (e.g. `goog:chromeOptions` and `ms:edgeOptions`)
   * from the capabilities to skip validation error for unrecognized capabilities.
   * @param caps
   * @returns
   */
  private excludeBrowserPrefixCaps(caps: Record<string, any>): Record<string, any> {
    const browserCapKeys = Object.keys(caps).filter(
      (key) => key.startsWith(CHROME_VENDOR_PREFIX) || key.startsWith(EDGE_VENDOR_PREFIX),
    );
    return Object.keys(caps).reduce(
      (acc, capName) => {
        if (!browserCapKeys.includes(capName)) {
          acc[capName] = caps[capName];
        }
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  private async getBrowserInfo(): Promise<BrowserInfo | undefined> {
    const browserBinary: string | undefined =
      (this.opts['goog:chromeOptions'] as Record<string, any>)?.binary ??
      (this.opts['ms:edgeOptions'] as Record<string, any>)?.binary;
    try {
      const bv = await this.getBrowserDriverStrategy().discoverBrowserVersion(browserBinary);
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

    return await this.getBrowserDriverStrategy().resolveExecutable(
      browserVersionInfo,
      isAutodownloadEnabled,
    );
  }

  private getExecutableDir(): string | undefined {
    if (this.opts.executableDir) {
      return this.opts.executableDir;
    }

    return this.getBrowserDriverStrategy().getDefaultExecutableDir();
  }

  private getBrowserDriverStrategy(): BrowserDriverStrategy {
    if (msedge.isMsEdge(this.opts.browserName)) {
      return {
        discoverBrowserVersion: async (browserBinary?: string) =>
          await msedge.discoverMsEdgeBrowserVersion(browserBinary),
        resolveExecutable: async (browserVersionInfo, isAutodownloadEnabled) =>
          await msedge.resolveDriverExecutable(
            this.opts,
            browserVersionInfo,
            isAutodownloadEnabled,
          ),
        getDefaultExecutableDir: () => msedge.getDefaultDriverDir(),
      };
    }

    return {
      discoverBrowserVersion: async (browserBinary?: string) =>
        await discoverChromeBrowserVersion(browserBinary),
      resolveExecutable: async () => undefined,
      getDefaultExecutableDir: () => this.getDefaultChromeDriverDir(),
    };
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
