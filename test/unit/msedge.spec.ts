import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import {
  decodeMicrosoftVersionResponse,
  getMsEdgeDriverDownloadUrl,
  getMsEdgeDriverVersion,
  getMsEdgePlatformConfig,
  isMsEdge,
} from '../../lib/msedge';

use(chaiAsPromised);

describe('msedge helpers', function () {
  afterEach(function () {
    sinon.restore();
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
      const payload = Buffer.from([0xff, 0xfe, 0x31, 0x00, 0x33, 0x00, 0x35, 0x00]);
      expect(decodeMicrosoftVersionResponse(payload)).to.equal('135');
    });

    it('decodes utf8 payloads', function () {
      expect(decodeMicrosoftVersionResponse(Buffer.from('135.0.3179.98\n'))).to.equal(
        '135.0.3179.98',
      );
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
              0xff, 0xfe, 0x31, 0x00, 0x33, 0x00, 0x35, 0x00, 0x2e, 0x00, 0x30, 0x00, 0x2e, 0x00,
              0x33, 0x00, 0x31, 0x00, 0x37, 0x00, 0x39, 0x00, 0x2e, 0x00, 0x39, 0x00, 0x38, 0x00,
              0x0a, 0x00,
            ]),
            {status: 200},
          ),
        );

      const version = await getMsEdgeDriverVersion('135.0.3179.73');

      expect(version).to.equal('135.0.3179.98');
      expect(fetchStub.firstCall.args[0]).to.include('LATEST_RELEASE_135_');
    });

    it('rejects unexpected version responses', async function () {
      sinon
        .stub(globalThis, 'fetch')
        .resolves(new Response(Buffer.from('not-a-version'), {status: 200}));

      await expect(getMsEdgeDriverVersion('135.0.3179.73')).to.be.rejectedWith(
        'unexpected MSEdgeDriver version response',
      );
    });
  });

  describe('getMsEdgeDriverDownloadUrl', function () {
    it('includes the platform archive name', function () {
      const url = getMsEdgeDriverDownloadUrl('135.0.3179.98');
      expect(url).to.match(/^https:\/\/msedgedriver\.microsoft\.com\/135\.0\.3179\.98\//);
      expect(url).to.match(/edgedriver_.+\.zip$/);
    });
  });
});
