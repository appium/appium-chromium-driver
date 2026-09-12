import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, it, afterEach} from 'node:test';

import {fs, tempDir, zip} from 'appium/support.js';
import sinon from 'sinon';

import {
  deployDriverArtifact,
  locateCachedDriverExecutable,
  locateDriverExecutableInDir,
} from '../../../lib/msedge/deployment.js';
import {getDriverExecutableName} from '../../../lib/msedge/platform.js';
import {Version} from '../../../lib/msedge/version.js';

describe('msedge deployment domain', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('selects the newest compatible patch from a versioned cache on disk', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'msedge-cache-'));
    const name = getDriverExecutableName();
    try {
      assert.equal(await locateCachedDriverExecutable(root, name, Version.from('147.0.3179.85')), null);
      for (const version of ['146.0.3179.100', '147.0.3180.100', '147.0.3179.9', '147.0.3179.98', 'current']) {
        const dir = path.join(root, version);
        await fs.mkdirp(dir);
        await fs.writeFile(path.join(dir, name), 'cached executable', {mode: 0o755});
      }
      assert.equal(
        await locateCachedDriverExecutable(root, name, Version.from('147.0.3179.85')),
        path.join(root, '147.0.3179.98', name),
      );
      assert.equal(await locateCachedDriverExecutable(root, name, Version.from('148.0.3179.85')), null);
    } finally {
      await fs.rimraf(root);
    }
  });

  it('skips cached files that are not executable', async () => {
    const root = path.join(os.tmpdir(), 'msedge-cache');
    const name = getDriverExecutableName();
    const newest = path.join(root, '147.0.3179.98', name);
    const older = path.join(root, '147.0.3179.9', name);
    sinon.stub(fs, 'glob').resolves([newest, older]);
    sinon.stub(fs, 'isExecutable').callsFake(async (file) => file === older);
    assert.equal(await locateCachedDriverExecutable(root, name, Version.from('147.0.3179.85')), older);
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
