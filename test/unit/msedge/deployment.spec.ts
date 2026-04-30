import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {fs, tempDir, zip} from 'appium/support';
import sinon from 'sinon';
import {deployDriverArtifact, locateDriverExecutableInDir} from '../../../lib/msedge/deployment';

use(chaiAsPromised);

describe('msedge deployment domain', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('findDriverExecutable', function () {
    it('uses the provided executable name to search candidates', async function () {
      const globStub = sinon.stub(fs, 'glob').resolves(['/tmp/a/custom-driver-bin']);

      const executable = await locateDriverExecutableInDir('/tmp/a', 'custom-driver-bin');

      expect(executable).to.equal('/tmp/a/custom-driver-bin');
      expect(globStub.firstCall.args[0]).to.equal('**/custom-driver-bin');
    });
  });

  describe('ensureDriver', function () {
    it('deploys using artifact metadata without platform helpers', async function () {
      sinon.stub(fs, 'isExecutable').resolves(false);
      sinon.stub(fs, 'mkdirp').resolves();
      sinon.stub(tempDir, 'openDir').resolves('/tmp/extract-root');
      sinon.stub(zip, 'extractAllTo').resolves();
      sinon.stub(fs, 'chmod').resolves();
      sinon.stub(fs, 'mv').resolves();
      sinon.stub(fs, 'rimraf').resolves();
      sinon.stub(fs, 'glob').resolves(['/tmp/msedgedrivers/123/Driver/custom-msedge-driver']);

      const downloadArchive = sinon.stub().resolves();

      const executable = await deployDriverArtifact(
        {
          archiveName: 'custom-archive.zip',
          executableName: 'custom-msedge-driver',
          version: '123.0.0.0',
        },
        '/tmp/msedgedrivers',
        downloadArchive,
      );

      expect(downloadArchive.firstCall.args[0]).to.equal('/tmp/extract-root/custom-archive.zip');
      expect(executable).to.equal('/tmp/msedgedrivers/123.0.0.0/custom-msedge-driver');
    });

    it('returns existing executable when already present', async function () {
      sinon.stub(fs, 'isExecutable').resolves(true);
      const downloadArchive = sinon.stub().resolves();

      const executable = await deployDriverArtifact(
        {
          archiveName: 'unused.zip',
          executableName: 'custom-msedge-driver',
          version: '123.0.0.0',
        },
        '/tmp/msedgedrivers',
        downloadArchive,
      );

      expect(executable).to.equal('/tmp/msedgedrivers/123.0.0.0/custom-msedge-driver');
      expect(downloadArchive.called).to.equal(false);
    });
  });
});
