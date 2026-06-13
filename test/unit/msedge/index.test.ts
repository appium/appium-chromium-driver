import {describe, it, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {fs, net, tempDir, zip} from 'appium/support.js';
import sinon from 'sinon';
import type {BrowserInfo} from '../../../lib/types.js';
import {determineDriverExecutable} from '../../../lib/msedge/index.js';

function makeMsedgeVersionResponse(version: string): Response {
  const payload = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(`${version}\n`, 'utf16le'),
  ]);
  return new Response(payload, {status: 200});
}

describe('msedge index orchestrator domain', () => {
  afterEach(() => {
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

  it('autodownloads when candidate is absent', async () => {
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

    const executable = await determineDriverExecutable(
      {browserName: 'msedge', executableDir: '/tmp/msedgedrivers'},
      browserVersionInfo,
    );
    assert.equal(executable, '/tmp/msedgedrivers/147.0.3179.98/msedgedriver');
  });
});
