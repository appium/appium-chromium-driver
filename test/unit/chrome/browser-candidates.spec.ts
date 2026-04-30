import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import {detectBrowserVersion} from '../../../lib/chrome';

use(chaiAsPromised);

const teenProcess = require('teen_process') as {exec};
const IS_WIN = process.platform === 'win32';

function resolveEffectiveBinary(binary: string, args: string[]): string {
  if (binary === 'powershell' && args[2]) {
    const match = /Get-Item '(.+)'/.exec(args[2]);
    if (match) {
      return match[1].replace(/''/g, "'");
    }
  }
  return binary;
}

async function withMockExec<T>(mockExec, run: () => Promise<T>): Promise<T> {
  const execStub = sinon.stub(teenProcess, 'exec').get(() => mockExec);
  try {
    return await run();
  } finally {
    execStub.restore();
  }
}

describe('chrome browser candidates domain', function () {
  it('discovers version from explicit Chrome binary', async function () {
    const exec = async (binary: string, args: string[] = []) => {
      const effective = resolveEffectiveBinary(binary, args);
      if (effective === '/usr/bin/chrome') {
        return {stdout: IS_WIN ? '135.0.7049.84' : 'Google Chrome/135.0.7049.84', stderr: '', code: 0};
      }
      return {stdout: '', stderr: 'not found', code: 1};
    };
    expect(await withMockExec(exec, () => detectBrowserVersion('/usr/bin/chrome'))).to.equal(
      '135.0.7049.84',
    );
  });

  it('supports candidate fallback for default discovery', async function () {
    const exec = async (binary: string, args: string[] = []) => {
      const effective = resolveEffectiveBinary(binary, args);
      if (effective === 'google-chrome') {
        return {stdout: '', stderr: 'not found', code: 1};
      }
      if (effective.includes('Chromium') || effective === 'chromium') {
        return {stdout: IS_WIN ? '135.0.7049.0' : 'Chromium/135.0.7049.0', stderr: '', code: 0};
      }
      return {stdout: '', stderr: 'not found', code: 1};
    };
    expect(await withMockExec(exec, () => detectBrowserVersion())).to.equal('135.0.7049.0');
  });

  it('throws when no candidate succeeds', async function () {
    const exec = async () => ({stdout: '', stderr: 'not found', code: 1});
    await withMockExec(exec, async () => {
      await expect(detectBrowserVersion()).to.be.rejectedWith('Could not determine browser version');
    });
  });
});
