import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {fs, net, tempDir, zip} from '@appium/support';
import path from 'node:path';
import sinon from 'sinon';
import * as strongboxModule from '@appium/strongbox';
import type {BrowserInfo} from '../../lib/types';
import {MsEdgeDriverHandler, msEdgeDriverHandler} from '../../lib/msedge';

use(chaiAsPromised);

function makeMsedgeVersionResponse(version: string, withBom = false): Response {
  const payload = withBom
    ? Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`${version}\n`, 'utf16le')])
    : Buffer.from(`${version}\n`);
  return new Response(payload, {status: 200});
}

async function withPlatform<T>(platform: NodeJS.Platform, run: () => Promise<T>): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(process, 'platform');
  if (!original) {
    throw new Error('Missing process.platform descriptor');
  }

  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
    enumerable: original.enumerable,
    writable: false,
  });

  try {
    return await run();
  } finally {
    Object.defineProperty(process, 'platform', original);
  }
}

describe('msedge helpers', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('MsEdgeDriverHandler', function () {
    it('matches Edge aliases through class API', function () {
      const handler = new MsEdgeDriverHandler();
      expect(handler.isMsEdge('msedge')).to.be.true;
      expect(handler.isMsEdge('MicrosoftEdge')).to.be.true;
      expect(handler.isMsEdge('chrome')).to.be.false;
    });

    it('returns an explicit executable path through class API', async function () {
      const handler = new MsEdgeDriverHandler();
      const executable = await handler.resolveDriverExecutable({
        browserName: 'msedge',
        executable: '/custom/msedgedriver',
      });
      expect(executable).to.equal('/custom/msedgedriver');
    });
  });

  describe('isMsEdge', function () {
    it('matches MSEdge aliases', function () {
      expect(msEdgeDriverHandler.isMsEdge('msedge')).to.be.true;
      expect(msEdgeDriverHandler.isMsEdge('MicrosoftEdge')).to.be.true;
      expect(msEdgeDriverHandler.isMsEdge('MICROSOFTEDGE')).to.be.true;
    });

    it('rejects non-edge browser names', function () {
      expect(msEdgeDriverHandler.isMsEdge('chrome')).to.be.false;
      expect(msEdgeDriverHandler.isMsEdge('chromium')).to.be.false;
      expect(msEdgeDriverHandler.isMsEdge(undefined)).to.be.false;
    });
  });

  describe('getDefaultMsEdgeDriverDir', function () {
    it('uses the strongbox container for msedgedrivers', function () {
      const strongboxStub = sinon
        .stub(strongboxModule, 'strongbox')
        .returns({container: '/tmp/msedgedrivers'} as ReturnType<typeof strongboxModule.strongbox>);

      expect(msEdgeDriverHandler.getDefaultDriverDir()).to.equal('/tmp/msedgedrivers');
      expect(
        strongboxStub.calledOnceWithExactly('appium-chromium-driver', {suffix: 'msedgedrivers'}),
      ).to.be.true;
    });
  });

  describe('resolveMsEdgeDriverExecutable', function () {
    const browserVersionInfo = {
      info: {Browser: '147.0.3179.85'},
    } as BrowserInfo;

    it('returns undefined for non-Edge browser names', async function () {
      expect(await msEdgeDriverHandler.resolveDriverExecutable({browserName: 'chrome'})).to.be
        .undefined;
    });

    it('returns the explicit executable path when provided', async function () {
      expect(
        await msEdgeDriverHandler.resolveDriverExecutable({
          browserName: 'msedge',
          executable: '/custom/msedgedriver',
        }),
      ).to.equal('/custom/msedgedriver');
    });

    it('returns an executable found in the provided directory before autodownloading', async function () {
      sinon.stub(fs, 'glob').resolves(['/tmp/msedgedrivers/current/msedgedriver']);

      const executable = await msEdgeDriverHandler.resolveDriverExecutable({
        browserName: 'msedge',
        executableDir: '/tmp/msedgedrivers',
      });

      expect(executable).to.equal('/tmp/msedgedrivers/current/msedgedriver');
    });

    it('returns undefined when autodownload is disabled and no executable is found', async function () {
      sinon.stub(fs, 'glob').resolves([]);

      const executable = await msEdgeDriverHandler.resolveDriverExecutable(
        {
          browserName: 'msedge',
          executableDir: '/tmp/msedgedrivers',
        },
        undefined,
        false,
      );

      expect(executable).to.be.undefined;
    });

    it('throws when autodownload is enabled but browser version is unavailable', async function () {
      sinon.stub(fs, 'glob').resolves([]);

      await expect(
        msEdgeDriverHandler.resolveDriverExecutable({
          browserName: 'msedge',
          executableDir: '/tmp/msedgedrivers',
        }),
      ).to.be.rejectedWith('Could not determine the installed Microsoft Edge version');
    });

    it('autodownloads into the provided executableDir when needed', async function () {
      sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse('147.0.3179.98'));
      sinon.stub(fs, 'isExecutable').resolves(false);
      sinon.stub(fs, 'mkdirp').resolves();
      sinon.stub(tempDir, 'openDir').resolves('/tmp/extract-root');
      sinon.stub(net, 'downloadFile').resolves();
      sinon.stub(zip, 'extractAllTo').resolves();
      sinon.stub(fs, 'chmod').resolves();
      sinon.stub(fs, 'mv').resolves();
      sinon.stub(fs, 'rimraf').resolves();
      sinon
        .stub(fs, 'glob')
        .onFirstCall()
        .resolves([])
        .onSecondCall()
        .resolves(['/tmp/msedgedrivers/147.0.3179.98/Driver/msedgedriver']);

      const executable = await msEdgeDriverHandler.resolveDriverExecutable(
        {
          browserName: 'msedge',
          executableDir: '/tmp/msedgedrivers',
        },
        browserVersionInfo,
      );

      expect(executable).to.equal('/tmp/msedgedrivers/147.0.3179.98/msedgedriver');
    });

    it('autodownloads into the default strongbox directory when executableDir is omitted', async function () {
      sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse('147.0.3179.98'));
      sinon.stub(strongboxModule, 'strongbox').returns({
        container: '/tmp/strongbox/msedgedrivers',
      } as ReturnType<typeof strongboxModule.strongbox>);
      sinon.stub(fs, 'isExecutable').resolves(false);
      sinon.stub(fs, 'mkdirp').resolves();
      sinon.stub(tempDir, 'openDir').resolves('/tmp/extract-root');
      sinon.stub(net, 'downloadFile').resolves();
      sinon.stub(zip, 'extractAllTo').resolves();
      sinon.stub(fs, 'chmod').resolves();
      sinon.stub(fs, 'mv').resolves();
      sinon.stub(fs, 'rimraf').resolves();
      sinon
        .stub(fs, 'glob')
        .resolves(['/tmp/strongbox/msedgedrivers/147.0.3179.98/Driver/msedgedriver']);

      const executable = await msEdgeDriverHandler.resolveDriverExecutable(
        {browserName: 'msedge'},
        browserVersionInfo,
      );

      expect(executable).to.equal('/tmp/strongbox/msedgedrivers/147.0.3179.98/msedgedriver');
    });

    it('uses Windows executable name via glob pattern on windows', async function () {
      await withPlatform('win32', async () => {
        sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse('147.0.3179.98'));
        sinon.stub(fs, 'isExecutable').resolves(false);
        sinon.stub(fs, 'mkdirp').resolves();
        sinon.stub(tempDir, 'openDir').resolves('/tmp/extract-root');
        sinon.stub(net, 'downloadFile').resolves();
        sinon.stub(zip, 'extractAllTo').resolves();
        const globStub = sinon
          .stub(fs, 'glob')
          .resolves(['C:/drivers/147.0.3179.98/Driver/msedgedriver.exe']);
        sinon.stub(fs, 'mv').resolves();
        sinon.stub(fs, 'rimraf').resolves();

        await msEdgeDriverHandler.resolveDriverExecutable(
          {
            browserName: 'msedge',
            executableDir: 'C:/drivers',
          },
          browserVersionInfo,
        );

        expect(globStub.firstCall.args[0]).to.equal('**/msedgedriver.exe');
      });
    });

    it('uses Unix executable name via glob pattern on Linux', async function () {
      await withPlatform('linux', async () => {
        sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse('147.0.3179.98'));
        sinon.stub(fs, 'isExecutable').resolves(false);
        sinon.stub(fs, 'mkdirp').resolves();
        sinon.stub(tempDir, 'openDir').resolves('/tmp/extract-root');
        sinon.stub(net, 'downloadFile').resolves();
        sinon.stub(zip, 'extractAllTo').resolves();
        sinon.stub(fs, 'chmod').resolves();
        const globStub = sinon
          .stub(fs, 'glob')
          .resolves(['/tmp/msedgedrivers/147.0.3179.98/Driver/msedgedriver']);
        sinon.stub(fs, 'mv').resolves();
        sinon.stub(fs, 'rimraf').resolves();

        await msEdgeDriverHandler.resolveDriverExecutable(
          {
            browserName: 'msedge',
            executableDir: '/tmp/msedgedrivers',
          },
          browserVersionInfo,
        );

        expect(globStub.firstCall.args[0]).to.equal('**/msedgedriver');
      });
    });

    it('decodes UTF-16LE version response with BOM', async function () {
      sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse('147.0.3179.98', true));
      sinon.stub(fs, 'isExecutable').resolves(false);
      sinon.stub(fs, 'mkdirp').resolves();
      sinon.stub(tempDir, 'openDir').resolves('/tmp/extract-root');
      sinon.stub(net, 'downloadFile').resolves();
      sinon.stub(zip, 'extractAllTo').resolves();
      sinon.stub(fs, 'chmod').resolves();
      sinon.stub(fs, 'glob').resolves(['/tmp/msedgedrivers/147.0.3179.98/msedgedriver']);
      sinon.stub(fs, 'mv').resolves();
      sinon.stub(fs, 'rimraf').resolves();

      const executable = await msEdgeDriverHandler.resolveDriverExecutable(
        {
          browserName: 'msedge',
          executableDir: '/tmp/msedgedrivers',
        },
        browserVersionInfo,
      );

      expect(executable).to.equal('/tmp/msedgedrivers/147.0.3179.98/msedgedriver');
    });

    it('skips chmod on Windows platform during autodownload', async function () {
      await withPlatform('win32', async () => {
        sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse('147.0.3179.98'));
        sinon.stub(fs, 'isExecutable').resolves(false);
        sinon.stub(fs, 'mkdirp').resolves();
        sinon.stub(tempDir, 'openDir').resolves('/tmp/extract-root');
        sinon.stub(net, 'downloadFile').resolves();
        sinon.stub(zip, 'extractAllTo').resolves();
        const chmodStub = sinon.stub(fs, 'chmod').resolves();
        sinon.stub(fs, 'glob').resolves(['C:/drivers/147.0.3179.98/Driver/msedgedriver.exe']);
        sinon.stub(fs, 'mv').resolves();
        sinon.stub(fs, 'rimraf').resolves();

        await msEdgeDriverHandler.resolveDriverExecutable(
          {
            browserName: 'msedge',
            executableDir: 'C:/drivers',
          },
          browserVersionInfo,
        );

        expect(chmodStub.called).to.be.false;
      });
    });
  });
});
