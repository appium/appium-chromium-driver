import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, afterEach, beforeEach} from 'node:test';

import {fs} from 'appium/support.js';
import sinon from 'sinon';

import type {BrowserInfo} from '../../../lib/types.js';
import {resetModuleMocks, installEdgeDriverStub} from '../helpers/module-mocks.js';

// Load after the module mock is installed.
const {determineDriverExecutable, getDefaultDriverDir} = await import('../../../lib/msedge/index.js');
const {getDriverExecutableName} = await import('../../../lib/msedge/platform.js');

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
      const cached = path.join(getDefaultDriverDir(), '147.0.3179.98', getDriverExecutableName());
      sinon.stub(fs, 'glob').resolves([cached]);
      sinon.stub(fs, 'isExecutable').resolves(true);

      assert.equal(
        await determineDriverExecutable({browserName: 'msedge'}, browserVersionInfo, autodownloadEnabled),
        cached,
      );
      sinon.assert.notCalled(installEdgeDriverStub);
    });
  }

  it('does not use an incompatible cache or access the network when autodownload is disabled', async () => {
    sinon.stub(fs, 'glob').resolves([path.join(getDefaultDriverDir(), '146.0.3179.98', getDriverExecutableName())]);
    assert.equal(await determineDriverExecutable({browserName: 'msedge'}, browserVersionInfo, false), undefined);
    sinon.assert.notCalled(installEdgeDriverStub);
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
      installEdgeDriverStub.resolves(installed);
      assert.equal(
        await determineDriverExecutable({browserName: 'msedge', executableDir: customDir}, browserVersionInfo),
        installed,
      );
      sinon.assert.calledOnceWithExactly(installEdgeDriverStub, {browserVersion: '147.0.3179.85', executableDir});
    });
  }
});
