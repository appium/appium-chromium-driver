import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {fs, net, tempDir, zip} from '@appium/support';
import sinon from 'sinon';
import * as strongboxModule from '@appium/strongbox';
import type {BrowserInfo} from '../../lib/types';
import {getDefaultMsEdgeDriverDir, isMsEdge, MsEdgeDriverHandler} from '../../lib/msedge';

use(chaiAsPromised);

/**
 * Returns a Response object with the given version string as the body, encoded as UTF-16LE with a BOM.
 * @param version
 * @returns
 */
function makeMsedgeVersionResponse(version: string): Response {
  const payload = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(`${version}\n`, 'utf16le'),
  ]);
  return new Response(payload, {status: 200});
}

describe('msedge helpers', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('MsEdgeDriverHandler', function () {
    it('returns an explicit executable path through class API', async function () {
      const executable = await MsEdgeDriverHandler.resolveDriverExecutable({
        browserName: 'msedge',
        executable: '/custom/msedgedriver',
      });
      expect(executable).to.equal('/custom/msedgedriver');
    });
  });

  describe('resolveMsEdgeDriverExecutable', function () {
    const browserVersionInfo = {
      info: {Browser: '147.0.3179.85'},
    } as BrowserInfo;

    it('returns undefined for non-Edge browser names', async function () {
      expect(await MsEdgeDriverHandler.resolveDriverExecutable({browserName: 'chrome'})).to.be
        .undefined;
    });

    it('returns the explicit executable path when provided', async function () {
      expect(
        await MsEdgeDriverHandler.resolveDriverExecutable({
          browserName: 'msedge',
          executable: '/custom/msedgedriver',
        }),
      ).to.equal('/custom/msedgedriver');
    });

    it('returns an executable found in the provided directory before autodownloading', async function () {
      sinon.stub(fs, 'glob').resolves(['/tmp/msedgedrivers/current/msedgedriver']);

      const executable = await MsEdgeDriverHandler.resolveDriverExecutable({
        browserName: 'msedge',
        executableDir: '/tmp/msedgedrivers',
      });

      expect(executable).to.equal('/tmp/msedgedrivers/current/msedgedriver');
    });

    it('returns undefined when autodownload is disabled and no executable is found', async function () {
      sinon.stub(fs, 'glob').resolves([]);

      const executable = await MsEdgeDriverHandler.resolveDriverExecutable(
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
        MsEdgeDriverHandler.resolveDriverExecutable({
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

      const executable = await MsEdgeDriverHandler.resolveDriverExecutable(
        {
          browserName: 'msedge',
          executableDir: '/tmp/msedgedrivers',
        },
        browserVersionInfo,
      );

      expect(executable).to.equal('/tmp/msedgedrivers/147.0.3179.98/msedgedriver');
    });

    it('decodes UTF-16LE version response with BOM', async function () {
      sinon.stub(globalThis, 'fetch').resolves(makeMsedgeVersionResponse('147.0.3179.98'));
      sinon.stub(fs, 'isExecutable').resolves(false);
      sinon.stub(fs, 'mkdirp').resolves();
      sinon.stub(tempDir, 'openDir').resolves('/tmp/extract-root');
      sinon.stub(net, 'downloadFile').resolves();
      sinon.stub(zip, 'extractAllTo').resolves();
      sinon.stub(fs, 'chmod').resolves();
      sinon.stub(fs, 'glob').resolves(['/tmp/msedgedrivers/147.0.3179.98/msedgedriver']);
      sinon.stub(fs, 'mv').resolves();
      sinon.stub(fs, 'rimraf').resolves();

      const executable = await MsEdgeDriverHandler.resolveDriverExecutable(
        {
          browserName: 'msedge',
          executableDir: '/tmp/msedgedrivers',
        },
        browserVersionInfo,
      );

      expect(executable).to.equal('/tmp/msedgedrivers/147.0.3179.98/msedgedriver');
    });
  });
});
