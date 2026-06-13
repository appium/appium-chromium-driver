import {describe, it, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {discoverMsEdgeBrowserVersion} from '../../../lib/msedge/index.js';
import {__resetExecForTests, __setExecForTests} from '../../../lib/utils/browser.js';

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

describe('msedge browser candidates domain', () => {
  afterEach(() => {
    __resetExecForTests();
  });

  it('discovers version from explicit Edge binary', async () => {
    __setExecForTests((async (binary: string, args: string[] = []) => {
      const effective = resolveEffectiveBinary(binary, args);
      if (effective === '/usr/bin/msedge') {
        return {
          stdout: IS_WIN ? '135.0.3179.85' : 'Microsoft Edge/135.0.3179.85',
          stderr: '',
          code: 0,
        };
      }
      return {stdout: '', stderr: 'not found', code: 1};
    }) as any);
    assert.equal(await discoverMsEdgeBrowserVersion('/usr/bin/msedge'), '135.0.3179.85');
  });

  it('default discovery checks only Edge candidates', async () => {
    const visited: string[] = [];
    __setExecForTests((async (binary: string, args: string[] = []) => {
      visited.push(resolveEffectiveBinary(binary, args));
      throw new Error('not found');
    }) as any);
    await discoverMsEdgeBrowserVersion().catch(() => {});
    assert.equal(
      visited.every((b) => /edge/i.test(b)),
      true,
    );
  });

  it('throws when explicit binary cannot be resolved', async () => {
    __setExecForTests((async () => ({stdout: '', stderr: 'not found', code: 1})) as any);
    await assert.rejects(
      () => discoverMsEdgeBrowserVersion('/nonexistent/msedge'),
      /Could not determine browser version/,
    );
  });
});
