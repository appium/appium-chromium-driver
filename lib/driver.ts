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
import type {W3CChromiumDriverCaps, ChromiumDriverCaps} from './types';

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
    body?: TReq
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

  override async createSession(
    jsonwpDesiredCapabilities: W3CChromiumDriverCaps,
    jsonwpRequiredCaps?: W3CChromiumDriverCaps,
    w3cCapabilities?: W3CChromiumDriverCaps,
    driverData?: DriverData[]
  ): Promise<DefaultCreateSessionResult<CDConstraints>> {
    const [sessionId] = await super.createSession(
      jsonwpDesiredCapabilities,
      jsonwpRequiredCaps,
      w3cCapabilities,
      driverData
    );
    const returnedCaps = await this.startChromedriverSession();
    if (returnedCaps.webSocketUrl) {
      this._bidiProxyUrl = String(returnedCaps.webSocketUrl);
    }
    return [sessionId, returnedCaps];
  }

  async startChromedriverSession(): Promise<ChromiumDriverCaps> {
    const isAutodownloadEnabled = this.opts.autodownloadEnabled ?? true;
    const cdOpts: ChromedriverOpts = {
      port: this.opts.chromedriverPort?.toString(),
      useSystemExecutable: this.opts.useSystemExecutable,
      executable: this.opts.executable,
      executableDir: this.opts.executableDir,
      verbose: this.opts.verbose,
      logPath: this.opts.logPath,
      disableBuildCheck: this.opts.disableBuildCheck,
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

