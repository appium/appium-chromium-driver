import {describe, it, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {detectBrowserVersion} from '../../../lib/chrome/index.js';
import {__resetExecForTests, __setExecForTests} from '../../../lib/utils.js';

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

describe('chrome browser candidates domain', () => {
  afterEach(() => {
    __resetExecForTests();
  });

  it('discovers version from explicit Chrome binary', async () => {
    __setExecForTests((async (binary: string, args: string[] = []) => {
      const effective = resolveEffectiveBinary(binary, args);
      if (effective === '/usr/bin/chrome') {
        return {
          stdout: IS_WIN ? '135.0.7049.84' : 'Google Chrome/135.0.7049.84',
          stderr: '',
          code: 0,
        };
      }
      return {stdout: '', stderr: 'not found', code: 1};
    }) as any);
    assert.equal(await detectBrowserVersion('/usr/bin/chrome'), '135.0.7049.84');
  });

  it('supports candidate fallback for default discovery', async () => {
    __setExecForTests((async (binary: string, args: string[] = []) => {
      const effective = resolveEffectiveBinary(binary, args);
      if (effective === 'google-chrome') {
        return {stdout: '', stderr: 'not found', code: 1};
      }
      if (effective.includes('Chromium') || effective === 'chromium') {
        return {stdout: IS_WIN ? '135.0.7049.0' : 'Chromium/135.0.7049.0', stderr: '', code: 0};
      }
      return {stdout: '', stderr: 'not found', code: 1};
    }) as any);
    assert.equal(await detectBrowserVersion(), '135.0.7049.0');
  });

  it('throws when no candidate succeeds', async () => {
    __setExecForTests((async () => ({stdout: '', stderr: 'not found', code: 1})) as any);
    await assert.rejects(() => detectBrowserVersion(), /Could not determine browser version/);
  });
});
