import {describe, it, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {fs, tempDir, zip} from 'appium/support.js';
import sinon from 'sinon';
import {deployDriverArtifact, locateDriverExecutableInDir} from '../../../lib/msedge/deployment.js';

describe('msedge deployment domain', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('findDriverExecutable', () => {
    it('uses the provided executable name to search candidates', async () => {
      const globStub = sinon.stub(fs, 'glob').resolves(['/tmp/a/custom-driver-bin']);

      const executable = await locateDriverExecutableInDir('/tmp/a', 'custom-driver-bin');

      assert.equal(executable, '/tmp/a/custom-driver-bin');
      assert.equal(globStub.firstCall.args[0], '**/custom-driver-bin');
    });
  });

  describe('ensureDriver', () => {
    it('deploys using artifact metadata without platform helpers', async () => {
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

      assert.equal(downloadArchive.firstCall.args[0], '/tmp/extract-root/custom-archive.zip');
      assert.equal(executable, '/tmp/msedgedrivers/123.0.0.0/custom-msedge-driver');
    });

    it('returns existing executable when already present', async () => {
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

      assert.equal(executable, '/tmp/msedgedrivers/123.0.0.0/custom-msedge-driver');
      assert.equal(downloadArchive.called, false);
    });
  });
});
