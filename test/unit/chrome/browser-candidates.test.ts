import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it, afterEach} from 'node:test';

import {detectBrowserVersion, listBrowserBinaryCandidates} from '../../../lib/chrome/index.js';
import {
  __resetExecForTests,
  __resetPathExistsForTests,
  __setExecForTests,
  __setPathExistsForTests,
  getWindowsExecutableCandidates,
} from '../../../lib/utils/browser.js';

const IS_WIN = process.platform === 'win32';

function resolveEffectiveBinary(binary: string, args: string[]): string {
  if (binary === 'powershell' && args[2]) {
    // readBrowserVersionWin passes the path as `$target = '<path>'` (single quotes doubled).
    const match = /\$target = '((?:[^']|'')+)'/.exec(args[2]) ?? /Get-Item '(.+)'/.exec(args[2]);
    if (match) {
      return match[1].replace(/''/g, "'");
    }
  }
  return binary;
}

describe('chrome browser candidates domain', () => {
  afterEach(() => {
    __resetExecForTests();
    __resetPathExistsForTests();
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
    __setPathExistsForTests(async () => true);
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

describe('Windows candidates in ChromeDriver search order', () => {
  const ENV_KEYS = ['LOCALAPPDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432'];
  const LOCAL = 'C:\\Users\\me\\AppData\\Local';
  const PF = 'C:\\Program Files';
  const PF86 = 'C:\\Program Files (x86)';

  function setWindowsEnv(): () => void {
    const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    Object.assign(process.env, {LOCALAPPDATA: LOCAL, PROGRAMFILES: PF, 'PROGRAMFILES(X86)': PF86, PROGRAMW6432: PF});
    return () => {
      for (const key of ENV_KEYS) {
        if (saved[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = saved[key];
        }
      }
    };
  }

  function withWindowsEnv<T>(fn: () => T): T {
    const restore = setWindowsEnv();
    try {
      return fn();
    } finally {
      restore();
    }
  }

  async function withWindowsEnvAsync<T>(fn: () => Promise<T>): Promise<T> {
    const restore = setWindowsEnv();
    try {
      return await fn();
    } finally {
      restore();
    }
  }

  it('tries each install folder in LOCALAPPDATA, PROGRAMFILES, PROGRAMFILES(X86) before the next folder', () => {
    const candidates = withWindowsEnv(() => getWindowsExecutableCandidates(['A', 'B'], 'x.exe'));
    assert.deepEqual(candidates, [
      path.win32.join(LOCAL, 'A', 'x.exe'),
      path.win32.join(PF, 'A', 'x.exe'),
      path.win32.join(PF86, 'A', 'x.exe'),
      path.win32.join(LOCAL, 'B', 'x.exe'),
      path.win32.join(PF, 'B', 'x.exe'),
      path.win32.join(PF86, 'B', 'x.exe'),
    ]);
  });

  describe('detection on Windows', {skip: !IS_WIN}, () => {
    afterEach(() => {
      __resetExecForTests();
      __resetPathExistsForTests();
    });

    function fakeInstalls(installed: Record<string, string>) {
      const spawned: string[] = [];
      __setPathExistsForTests(async (p) => p in installed);
      __setExecForTests((async (binary: string, args: string[] = []) => {
        const effective = resolveEffectiveBinary(binary, args);
        spawned.push(effective);
        return effective in installed
          ? {stdout: installed[effective], stderr: '', code: 0}
          : {stdout: '', stderr: 'not found', code: 1};
      }) as any);
      return spawned;
    }

    it('lists Google Chrome, then Chrome for Testing, then Chromium, with Beta and Dev last', () => {
      const dirs = withWindowsEnv(() => listBrowserBinaryCandidates()).map((p) =>
        path.win32.relative(LOCAL, path.win32.dirname(p)),
      );
      const firstOf = (dir: string) => dirs.indexOf(dir);
      assert.equal(firstOf('Google\\Chrome\\Application'), 0);
      assert.ok(firstOf('Google\\Chrome for Testing\\Application') > firstOf('Google\\Chrome\\Application'));
      assert.ok(firstOf('Chromium\\Application') > firstOf('Google\\Chrome for Testing\\Application'));
      assert.ok(firstOf('Google\\Chrome Beta\\Application') > firstOf('Chromium\\Application'));
      assert.ok(firstOf('Google\\Chrome Dev\\Application') > firstOf('Google\\Chrome Beta\\Application'));
    });

    it('prefers a per-user Google Chrome over a system-wide Chrome Beta, as ChromeDriver does', async () => {
      const perUserStable = path.win32.join(LOCAL, 'Google\\Chrome\\Application', 'chrome.exe');
      const systemBeta = path.win32.join(PF, 'Google\\Chrome Beta\\Application', 'chrome.exe');
      fakeInstalls({[perUserStable]: '141.0.7390.54', [systemBeta]: '142.0.7444.3'});
      assert.equal(await withWindowsEnvAsync(() => detectBrowserVersion()), '141.0.7390.54');
    });

    it('finds Chrome for Testing in the folder ChromeDriver checks', async () => {
      const cft = path.win32.join(PF, 'Google\\Chrome for Testing\\Application', 'chrome.exe');
      fakeInstalls({[cft]: '141.0.7390.54'});
      assert.equal(await withWindowsEnvAsync(() => detectBrowserVersion()), '141.0.7390.54');
    });

    it('only spawns PowerShell for candidates that exist', async () => {
      const systemStable = path.win32.join(PF86, 'Google\\Chrome\\Application', 'chrome.exe');
      const spawned = fakeInstalls({[systemStable]: '141.0.7390.54'});
      assert.equal(await withWindowsEnvAsync(() => detectBrowserVersion()), '141.0.7390.54');
      assert.deepEqual(spawned, [systemStable]);
    });
  });
});
