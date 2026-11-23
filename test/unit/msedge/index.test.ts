import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, afterEach, beforeEach} from 'node:test';

import {fs} from 'appium/support.js';
import sinon from 'sinon';

import type {BrowserInfo} from '../../../lib/types.js';
import {resetModuleMocks, installDriverFromArchiveStub} from '../helpers/module-mocks.js';

// Load after the module mock is installed.
const {determineDriverExecutable, getDefaultDriverDir} = await import('../../../lib/msedge/index.js');
const {getDriverExecutableName, getPlatformConfig} = await import('../../../lib/msedge/platform.js');

describe('msedge index orchestrator domain', () => {
  beforeEach(() => {
    // Globbed paths are fake; treat them all as regular files.
    sinon.stub(fs, 'stat').resolves({isFile: () => true} as Awaited<ReturnType<typeof fs.stat>>);
  });

  afterEach(() => {
    resetModuleMocks();
    sinon.restore();
  });

  const browserVersionInfo = {info: {Browser: '147.0.3179.85'}} as BrowserInfo;

  it('returns undefined for non-Edge browsers', async () => {
    assert.equal(await determineDriverExecutable({browserName: 'chrome'}), undefined);
  });

  it('returns explicit executable when provided', async () => {
    assert.equal(
      await determineDriverExecutable({browserName: 'msedge', executable: '/custom/msedgedriver'}),
      '/custom/msedgedriver',
    );
  });

  it('uses provided executableDir candidate before autodownload', async () => {
    sinon.stub(fs, 'glob').resolves(['/tmp/msedgedrivers/current/msedgedriver']);
    assert.equal(
      await determineDriverExecutable({browserName: 'msedge', executableDir: '/tmp/msedgedrivers'}),
      '/tmp/msedgedrivers/current/msedgedriver',
    );
  });

  for (const autodownloadEnabled of [false, true]) {
    it(`reuses the default cache without network access with autodownload=${autodownloadEnabled}`, async () => {
      const fetchStub = sinon.stub(globalThis, 'fetch');
      const cached = path.join(getDefaultDriverDir(), '147.0.3179.98', getDriverExecutableName());
      sinon.stub(fs, 'glob').resolves([cached]);
      sinon.stub(fs, 'isExecutable').resolves(true);

      assert.equal(
        await determineDriverExecutable({browserName: 'msedge'}, browserVersionInfo, autodownloadEnabled),
        cached,
      );
      sinon.assert.notCalled(fetchStub);
      sinon.assert.notCalled(installDriverFromArchiveStub);
    });
  }

  it('does not use an incompatible cache or access the network when autodownload is disabled', async () => {
    sinon.stub(fs, 'glob').resolves([path.join(getDefaultDriverDir(), '146.0.3179.98', getDriverExecutableName())]);
    assert.equal(await determineDriverExecutable({browserName: 'msedge'}, browserVersionInfo, false), undefined);
    sinon.assert.notCalled(installDriverFromArchiveStub);
  });

  it('returns undefined when autodownload is disabled and no driver exists in executableDir', async () => {
    sinon.stub(fs, 'glob').resolves([]);
    assert.equal(
      await determineDriverExecutable(
        {browserName: 'msedge', executableDir: '/tmp/msedgedrivers'},
        browserVersionInfo,
        false,
      ),
      undefined,
    );
  });

  it('throws when autodownload is enabled but browser version is unknown', async () => {
    sinon.stub(fs, 'glob').resolves([]);
    await assert.rejects(
      () => determineDriverExecutable({browserName: 'msedge', executableDir: '/tmp/msedgedrivers'}),
      /Could not determine the installed Microsoft Edge version required for autodownload/,
    );
  });

  for (const customDir of [undefined, '/tmp/msedgedrivers']) {
    it(`installs into ${customDir ?? 'the default cache'} when no candidate exists`, async () => {
      sinon.stub(fs, 'glob').resolves([]);
      const executableDir = customDir ?? getDefaultDriverDir();
      const installed = path.join(executableDir, '147.0.3179.98', getDriverExecutableName());
      const {releaseChannel, archiveName} = getPlatformConfig();
      const baseUrl = 'https://msedgedriver.microsoft.com';
      const fetchStub = sinon.stub(globalThis, 'fetch');
      fetchStub
        .withArgs(`${baseUrl}/LATEST_RELEASE_147_${releaseChannel}`, sinon.match.any)
        .resolves(new Response(Buffer.from('\uFEFF147.0.3179.98\n', 'utf16le')));
      const response = new Response('archive');
      fetchStub.withArgs(`${baseUrl}/147.0.3179.98/${archiveName}`, sinon.match.any).resolves(response);
      installDriverFromArchiveStub.resolves(installed);
      assert.equal(
        await determineDriverExecutable({browserName: 'msedge', executableDir: customDir}, browserVersionInfo),
        installed,
      );
      sinon.assert.calledOnceWithExactly(installDriverFromArchiveStub, {
        archive: response.body,
        executableName: getDriverExecutableName(),
        destination: installed,
      });
    });
  }

  it('propagates a failed Microsoft archive download before registration', async () => {
    sinon.stub(fs, 'glob').resolves([]);
    const fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.onFirstCall().resolves(new Response('147.0.3179.98'));
    fetchStub.onSecondCall().resolves(new Response(null, {status: 404}));
    await assert.rejects(determineDriverExecutable({browserName: 'msedge'}, browserVersionInfo), /status 404/);
    sinon.assert.notCalled(installDriverFromArchiveStub);
  });
});
