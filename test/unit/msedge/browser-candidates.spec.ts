import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import {discoverMsEdgeBrowserVersion} from '../../../lib/msedge';

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

describe('msedge browser candidates domain', function () {
  it('discovers version from explicit Edge binary', async function () {
    const exec = async (binary: string, args: string[] = []) => {
      const effective = resolveEffectiveBinary(binary, args);
      if (effective === '/usr/bin/msedge') {
        return {stdout: IS_WIN ? '135.0.3179.85' : 'Microsoft Edge/135.0.3179.85', stderr: '', code: 0};
      }
      return {stdout: '', stderr: 'not found', code: 1};
    };
    expect(await withMockExec(exec, () => discoverMsEdgeBrowserVersion('/usr/bin/msedge'))).to.equal(
      '135.0.3179.85',
    );
  });

  it('default discovery checks only Edge candidates', async function () {
    const visited: string[] = [];
    const exec = async (binary: string, args: string[] = []) => {
      visited.push(resolveEffectiveBinary(binary, args));
      throw new Error('not found');
    };
    await withMockExec(exec, async () => {
      await discoverMsEdgeBrowserVersion().catch(() => {});
    });
    expect(visited.every((b) => /edge/i.test(b))).to.equal(true);
  });

  it('throws when explicit binary cannot be resolved', async function () {
    const exec = async () => ({stdout: '', stderr: 'not found', code: 1});
    await withMockExec(exec, async () => {
      await expect(discoverMsEdgeBrowserVersion('/nonexistent/msedge')).to.be.rejectedWith(
        'Could not determine browser version',
      );
    });
  });
});
