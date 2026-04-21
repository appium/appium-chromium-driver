import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {fs, net, tempDir, zip} from '@appium/support';
import path from 'node:path';
import sinon from 'sinon';
import * as strongboxModule from '@appium/strongbox';
import type {BrowserInfo} from '../../lib/types';
import {
  BrowserVersion,
  ensureMsEdgeDriver,
  decodeMicrosoftVersionResponse,
  findMsEdgeDriverExecutable,
  getDefaultMsEdgeDriverDir,
  getMsEdgeDriverDownloadUrl,
  getMsEdgeDriverExecutableName,
  getMsEdgeDriverVersion,
  getMsEdgePlatformConfig,
  isMsEdge,
  resolveMsEdgeDriverExecutable,
} from '../../lib/msedge';

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

  describe('BrowserVersion', function () {
    it('returns the major version', function () {
      expect(BrowserVersion.from('147.0.3179.73').major).to.equal('147');
    });

    it('keeps the original value in toString', function () {
      expect(BrowserVersion.from('147.0.3179.73').toString()).to.equal('147.0.3179.73');
    });

    it('throws when major version cannot be parsed', function () {
      expect(() => BrowserVersion.from('edge-canary').major).to.throw(
        "Cannot determine major version from 'edge-canary'",
      );
    });
  });

  describe('isMsEdge', function () {
    it('matches MSEdge aliases', function () {
      expect(isMsEdge('msedge')).to.be.true;
      expect(isMsEdge('MicrosoftEdge')).to.be.true;
      expect(isMsEdge('MICROSOFTEDGE')).to.be.true;
    });

    it('rejects non-edge browser names', function () {
      expect(isMsEdge('chrome')).to.be.false;
      expect(isMsEdge('chromium')).to.be.false;
      expect(isMsEdge(undefined)).to.be.false;
    });
  });

  describe('decodeMicrosoftVersionResponse', function () {
    it('decodes utf16le payloads with a BOM', function () {
      const payload = Buffer.from([0xff, 0xfe, 0x31, 0x00, 0x34, 0x00, 0x37, 0x00]);
      expect(decodeMicrosoftVersionResponse(payload)).to.equal('147');
    });

    it('decodes utf8 payloads', function () {
      expect(decodeMicrosoftVersionResponse(Buffer.from('147.0.3179.98\n'))).to.equal(
        '147.0.3179.98',
      );
    });
  });

  describe('getMsEdgeDriverExecutableName', function () {
    it('returns the Windows executable name on win32', async function () {
      await withPlatform('win32', async () => {
        expect(getMsEdgeDriverExecutableName()).to.equal('msedgedriver.exe');
      });
    });

    it('returns the unix executable name on non-Windows platforms', async function () {
      await withPlatform('linux', async () => {
        expect(getMsEdgeDriverExecutableName()).to.equal('msedgedriver');
      });
    });
  });

  describe('getMsEdgePlatformConfig', function () {
    it('returns the expected Windows config', function () {
      expect(getMsEdgePlatformConfig('win32', 'x64')).to.deep.equal({
        archiveName: 'edgedriver_win64.zip',
        releaseChannel: 'WINDOWS',
      });
    });

    it('returns the expected macOS arm64 config', function () {
      expect(getMsEdgePlatformConfig('darwin', 'arm64')).to.deep.equal({
        archiveName: 'edgedriver_mac64_m1.zip',
        releaseChannel: 'MACOS',
      });
    });

    it('returns the expected Linux config', function () {
      expect(getMsEdgePlatformConfig('linux', 'x64')).to.deep.equal({
        archiveName: 'edgedriver_linux64.zip',
        releaseChannel: 'LINUX',
      });
    });
  });

  describe('getMsEdgeDriverVersion', function () {
    it('decodes the platform release endpoint response', async function () {
      const fetchStub = sinon
        .stub(globalThis, 'fetch')
        .resolves(
          new Response(
            Buffer.from([
              0xff, 0xfe, 0x31, 0x00, 0x34, 0x00, 0x37, 0x00, 0x2e, 0x00, 0x30, 0x00, 0x2e, 0x00,
              0x33, 0x00, 0x31, 0x00, 0x37, 0x00, 0x39, 0x00, 0x2e, 0x00, 0x39, 0x00, 0x38, 0x00,
              0x0a, 0x00,
            ]),
            {status: 200},
          ),
        );

      const version = await getMsEdgeDriverVersion('147.0.3179.73');

      expect(version).to.equal('147.0.3179.98');
      expect(fetchStub.firstCall.args[0]).to.include('LATEST_RELEASE_147_');
    });

    it('rejects unexpected version responses', async function () {
      sinon
        .stub(globalThis, 'fetch')
        .resolves(new Response(Buffer.from('not-a-version'), {status: 200}));

      await expect(getMsEdgeDriverVersion('147.0.3179.73')).to.be.rejectedWith(
        'unexpected MSEdgeDriver version response',
      );
    });
  });

  describe('getMsEdgeDriverDownloadUrl', function () {
    it('includes the platform archive name', function () {
      const url = getMsEdgeDriverDownloadUrl('147.0.3179.98');
      expect(url).to.match(/^https:\/\/msedgedriver\.microsoft\.com\/147\.0\.3179\.98\//);
      expect(url).to.match(/edgedriver_.+\.zip$/);
    });
  });

  describe('getDefaultMsEdgeDriverDir', function () {
    it('uses the strongbox container for msedgedrivers', function () {
      const strongboxStub = sinon
        .stub(strongboxModule, 'strongbox')
        .returns({container: '/tmp/msedgedrivers'} as ReturnType<typeof strongboxModule.strongbox>);

      expect(getDefaultMsEdgeDriverDir()).to.equal('/tmp/msedgedrivers');
      expect(
        strongboxStub.calledOnceWithExactly('appium-chromium-driver', {suffix: 'msedgedrivers'}),
      ).to.be.true;
    });
  });

  describe('findMsEdgeDriverExecutable', function () {
    it('uses the Windows executable glob pattern', async function () {
      const globStub = sinon.stub(fs, 'glob').resolves(['C:/drivers/msedgedriver.exe']);

      await withPlatform('win32', async () => {
        const executable = await findMsEdgeDriverExecutable('C:/drivers');
        expect(executable).to.equal('C:/drivers/msedgedriver.exe');
      });

      expect(globStub.calledOnce).to.be.true;
      expect(globStub.firstCall.args[0]).to.equal('**/msedgedriver.exe');
      expect(globStub.firstCall.args[1]).to.deep.equal({
        cwd: 'C:/drivers',
        absolute: true,
        nodir: true,
      });
    });

    it('returns the shortest matching path when multiple candidates exist', async function () {
      sinon
        .stub(fs, 'glob')
        .resolves([
          '/tmp/msedgedrivers/135/nested/msedgedriver',
          '/tmp/msedgedrivers/135/msedgedriver',
        ]);

      const executable = await findMsEdgeDriverExecutable('/tmp/msedgedrivers');
      expect(executable).to.equal('/tmp/msedgedrivers/135/msedgedriver');
    });

    it('returns null when no executable is found', async function () {
      sinon.stub(fs, 'glob').resolves([]);
      expect(await findMsEdgeDriverExecutable('/tmp/msedgedrivers')).to.be.null;
    });
  });

  describe('ensureMsEdgeDriver', function () {
    const browserVersion = '147.0.3179.85';
    const driverVersion = '147.0.3179.98';

    it('returns an existing executable without downloading again', async function () {
      sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse(driverVersion, true));
      const isExecutableStub = sinon.stub(fs, 'isExecutable').resolves(true);
      const downloadStub = sinon.stub(net, 'downloadFile').resolves();
      const executableDir = '/tmp/msedgedrivers';

      const executable = await ensureMsEdgeDriver(browserVersion, executableDir);
      const expectedPath = path.join(executableDir, driverVersion, getMsEdgeDriverExecutableName());

      expect(executable).to.equal(expectedPath);
      expect(isExecutableStub.calledOnceWithExactly(expectedPath)).to.be.true;
      expect(downloadStub.called).to.be.false;
    });

    it('downloads, extracts, normalizes, and returns the executable path', async function () {
      sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse(driverVersion));
      sinon.stub(fs, 'isExecutable').resolves(false);
      const mkdirpStub = sinon.stub(fs, 'mkdirp').resolves();
      sinon.stub(tempDir, 'openDir').resolves('/tmp/extract-root');
      const downloadStub = sinon.stub(net, 'downloadFile').resolves();
      const extractStub = sinon.stub(zip, 'extractAllTo').resolves();
      const chmodStub = sinon.stub(fs, 'chmod').resolves();
      const mvStub = sinon.stub(fs, 'mv').resolves();
      const rimrafStub = sinon.stub(fs, 'rimraf').resolves();
      const executableDir = '/tmp/msedgedrivers';
      const targetDir = path.join(executableDir, driverVersion);
      const targetExecutable = path.join(targetDir, getMsEdgeDriverExecutableName());
      const extractedExecutable = path.join(targetDir, 'Driver', getMsEdgeDriverExecutableName());
      sinon.stub(fs, 'glob').resolves([extractedExecutable]);

      const executable = await ensureMsEdgeDriver(browserVersion, executableDir);
      const archivePath = path.join('/tmp/extract-root', getMsEdgePlatformConfig().archiveName);

      expect(executable).to.equal(targetExecutable);
      expect(mkdirpStub.calledOnceWithExactly(targetDir)).to.be.true;
      expect(
        downloadStub.calledOnceWithExactly(getMsEdgeDriverDownloadUrl(driverVersion), archivePath),
      ).to.be.true;
      expect(extractStub.calledOnceWithExactly(archivePath, targetDir)).to.be.true;
      expect(chmodStub.calledOnceWithExactly(extractedExecutable, 0o755)).to.be.true;
      expect(
        mvStub.calledOnceWithExactly(extractedExecutable, targetExecutable, {
          mkdirp: true,
          clobber: true,
        }),
      ).to.be.true;
      expect(rimrafStub.calledOnceWithExactly('/tmp/extract-root')).to.be.true;
    });

    it('skips chmod on Windows while still finding the .exe via glob', async function () {
      await withPlatform('win32', async () => {
        sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse(driverVersion));
        sinon.stub(fs, 'isExecutable').resolves(false);
        sinon.stub(fs, 'mkdirp').resolves();
        sinon.stub(tempDir, 'openDir').resolves('C:/temp/extract-root');
        sinon.stub(net, 'downloadFile').resolves();
        sinon.stub(zip, 'extractAllTo').resolves();
        const chmodStub = sinon.stub(fs, 'chmod').resolves();
        const mvStub = sinon.stub(fs, 'mv').resolves();
        sinon.stub(fs, 'rimraf').resolves();
        const globStub = sinon
          .stub(fs, 'glob')
          .resolves(['C:/drivers/147.0.3179.98/Driver/msedgedriver.exe']);

        const executable = await ensureMsEdgeDriver(browserVersion, 'C:/drivers');

        expect(executable).to.equal('C:/drivers/147.0.3179.98/msedgedriver.exe');
        expect(globStub.firstCall.args[0]).to.equal('**/msedgedriver.exe');
        expect(chmodStub.called).to.be.false;
        expect(mvStub.calledOnce).to.be.true;
      });
    });

    it('cleans up the temp directory when extraction does not contain the executable', async function () {
      sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse(driverVersion));
      sinon.stub(fs, 'isExecutable').resolves(false);
      sinon.stub(fs, 'mkdirp').resolves();
      sinon.stub(tempDir, 'openDir').resolves('/tmp/extract-root');
      sinon.stub(net, 'downloadFile').resolves();
      sinon.stub(zip, 'extractAllTo').resolves();
      sinon.stub(fs, 'glob').resolves([]);
      const rimrafStub = sinon.stub(fs, 'rimraf').resolves();

      await expect(ensureMsEdgeDriver(browserVersion, '/tmp/msedgedrivers')).to.be.rejectedWith(
        `Cannot find '${getMsEdgeDriverExecutableName()}'`,
      );
      expect(rimrafStub.calledOnceWithExactly('/tmp/extract-root')).to.be.true;
    });
  });

  describe('resolveMsEdgeDriverExecutable', function () {
    const browserVersionInfo = {
      info: {Browser: '147.0.3179.85'},
    } as BrowserInfo;

    it('returns undefined for non-Edge browser names', async function () {
      expect(await resolveMsEdgeDriverExecutable({browserName: 'chrome'})).to.be.undefined;
    });

    it('returns the explicit executable path when provided', async function () {
      expect(
        await resolveMsEdgeDriverExecutable({
          browserName: 'msedge',
          executable: '/custom/msedgedriver',
        }),
      ).to.equal('/custom/msedgedriver');
    });

    it('returns an executable found in the provided directory before autodownloading', async function () {
      sinon.stub(fs, 'glob').resolves(['/tmp/msedgedrivers/current/msedgedriver']);

      const executable = await resolveMsEdgeDriverExecutable({
        browserName: 'msedge',
        executableDir: '/tmp/msedgedrivers',
      });

      expect(executable).to.equal('/tmp/msedgedrivers/current/msedgedriver');
    });

    it('returns undefined when autodownload is disabled and no executable is found', async function () {
      sinon.stub(fs, 'glob').resolves([]);

      const executable = await resolveMsEdgeDriverExecutable(
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
        resolveMsEdgeDriverExecutable({
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

      const executable = await resolveMsEdgeDriverExecutable(
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

      const executable = await resolveMsEdgeDriverExecutable(
        {browserName: 'msedge'},
        browserVersionInfo,
      );

      expect(executable).to.equal('/tmp/strongbox/msedgedrivers/147.0.3179.98/msedgedriver');
    });
  });
});
