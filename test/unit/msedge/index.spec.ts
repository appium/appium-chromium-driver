import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {fs, net, tempDir, zip} from '@appium/support';
import sinon from 'sinon';
import type {BrowserInfo} from '../../../lib/types';
import {resolveDriverExecutable} from '../../../lib/msedge';

use(chaiAsPromised);

function makeMsedgeVersionResponse(version: string): Response {
  const payload = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(`${version}\n`, 'utf16le'),
  ]);
  return new Response(payload, {status: 200});
}

describe('msedge index orchestrator domain', function () {
  afterEach(function () {
    sinon.restore();
  });

  const browserVersionInfo = {info: {Browser: '147.0.3179.85'}} as BrowserInfo;

  it('returns undefined for non-Edge browsers', async function () {
    expect(await resolveDriverExecutable({browserName: 'chrome'})).to.be.undefined;
  });

  it('returns explicit executable when provided', async function () {
    expect(
      await resolveDriverExecutable({browserName: 'msedge', executable: '/custom/msedgedriver'}),
    ).to.equal('/custom/msedgedriver');
  });

  it('uses provided executableDir candidate before autodownload', async function () {
    sinon.stub(fs, 'glob').resolves(['/tmp/msedgedrivers/current/msedgedriver']);
    expect(
      await resolveDriverExecutable({browserName: 'msedge', executableDir: '/tmp/msedgedrivers'}),
    ).to.equal('/tmp/msedgedrivers/current/msedgedriver');
  });

  it('autodownloads when candidate is absent', async function () {
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

    const executable = await resolveDriverExecutable(
      {browserName: 'msedge', executableDir: '/tmp/msedgedrivers'},
      browserVersionInfo,
    );
    expect(executable).to.equal('/tmp/msedgedrivers/147.0.3179.98/msedgedriver');
  });
});
