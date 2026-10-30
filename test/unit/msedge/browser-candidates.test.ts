import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, afterEach} from 'node:test';

import {fs, system} from 'appium/support.js';
import sinon from 'sinon';

import {discoverMsEdgeBrowserVersion} from '../../../lib/msedge/index.js';
import {__resetExecForTests, __setExecForTests} from '../../../lib/utils/browser.js';

const IS_WIN = process.platform === 'win32';

function resolveEffectiveBinary(binary: string, args: string[]): string {
  if (binary === 'powershell' && args[2]) {
    // readBrowserVersionWin passes the path as `$target = '<path>'` (single quotes doubled).
    const match = /\$target = '((?:[^']|'')+)'/.exec(args[2]) ?? /Get-Item '(.+)'/.exec(args[2]);
    if (match) {
      return match[1].replace(/''/g, "'");
    }
  }
  if (binary === 'reg' && args[1]) {
    return args[1];
  }
  return binary;
}

describe('msedge browser candidates domain', () => {
  afterEach(() => {
    __resetExecForTests();
    sinon.restore();
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

  it('reads Edge version from Windows Registry before spawning PowerShell', async () => {
    sinon.stub(system, 'isWindows').returns(true);
    const calls: string[] = [];
    __setExecForTests((async (binary: string, args: string[] = []) => {
      calls.push(`${binary}:${args.join(' ')}`);
      if (binary === 'reg' && args[1] === 'HKCU\\Software\\Microsoft\\Edge\\BLBeacon') {
        return {
          stdout:
            '\r\nHKEY_CURRENT_USER\\Software\\Microsoft\\Edge\\BLBeacon\r\n    version    REG_SZ    141.0.3537.57\r\n',
          stderr: '',
          code: 0,
        };
      }
      throw new Error('not found');
    }) as any);
    assert.equal(await discoverMsEdgeBrowserVersion(), '141.0.3537.57');
    assert.equal(
      calls.some((call) => call.startsWith('powershell:')),
      false,
    );
  });
});

describe('Windows Edge candidates in msedgedriver search order', {skip: !IS_WIN}, () => {
  const ENV_KEYS = ['LOCALAPPDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432'];
  const LOCAL = 'C:\\Users\\me\\AppData\\Local';
  const PF = 'C:\\Program Files';
  const PF86 = 'C:\\Program Files (x86)';
  let saved: Record<string, string | undefined> = {};

  function fakeInstalls(installed: Record<string, string>): string[] {
    saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    Object.assign(process.env, {LOCALAPPDATA: LOCAL, PROGRAMFILES: PF, 'PROGRAMFILES(X86)': PF86, PROGRAMW6432: PF});
    const spawned: string[] = [];
    sinon.stub(fs, 'exists').callsFake(async (p) => String(p) in installed);
    __setExecForTests((async (binary: string, args: string[] = []) => {
      if (binary === 'reg') {
        throw new Error('registry key not found');
      }
      const effective = resolveEffectiveBinary(binary, args);
      spawned.push(effective);
      return effective in installed
        ? {stdout: installed[effective], stderr: '', code: 0}
        : {stdout: '', stderr: 'not found', code: 1};
    }) as any);
    return spawned;
  }

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
    __resetExecForTests();
    sinon.restore();
  });

  it('prefers stable Edge in any install folder over Edge Beta, as msedgedriver does', async () => {
    const systemStable = path.win32.join(PF86, 'Microsoft\\Edge\\Application', 'msedge.exe');
    const beta = path.win32.join(PF, 'Microsoft\\Edge Beta\\Application', 'msedge.exe');
    fakeInstalls({[systemStable]: '141.0.3537.57', [beta]: '142.0.3595.6'});
    assert.equal(await discoverMsEdgeBrowserVersion(), '141.0.3537.57');
  });

  it('only spawns PowerShell for candidates that exist', async () => {
    const systemStable = path.win32.join(PF86, 'Microsoft\\Edge\\Application', 'msedge.exe');
    const spawned = fakeInstalls({[systemStable]: '141.0.3537.57'});
    assert.equal(await discoverMsEdgeBrowserVersion(), '141.0.3537.57');
    assert.deepEqual(spawned, [systemStable]);
  });
});
