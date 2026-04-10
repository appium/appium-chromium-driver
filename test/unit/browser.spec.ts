import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {getBrowserVersion} from '../../lib/browser';

use(chaiAsPromised);

type ExecFn = (binary: string, args: string[]) => Promise<{stdout: string}>;

const IS_WIN = process.platform === 'win32';

/** Resolves the effective binary path from either a direct call or a Windows powershell Get-Item call. */
function resolveEffectiveBinary(binary: string, args: string[]): string {
  if (binary === 'powershell' && args[2]) {
    const match = /Get-Item '(.+)'/.exec(args[2]);
    if (match) {
      return match[1].replace(/''/g, "'");
    }
  }
  return binary;
}

function makeExec(outputs: Record<string, string>): ExecFn {
  return async (binary: string, args: string[]) => {
    const effective = resolveEffectiveBinary(binary, args);
    if (effective in outputs) {
      return {stdout: outputs[effective]};
    }
    throw new Error(`${effective}: not found`);
  };
}

describe('getBrowserVersion', function () {
  describe('with a supplied chromeBinary', function () {
    it('parses Chrome/X.Y.Z.W format', async function () {
      const exec = makeExec({
        '/usr/bin/chrome': IS_WIN ? '135.0.7049.84' : 'Google Chrome/135.0.7049.84',
      });
      const version = await getBrowserVersion('/usr/bin/chrome', undefined, exec);
      expect(version).to.equal('135.0.7049.84');
    });

    it('parses "Google Chrome X.Y.Z.W" format (no slash)', async function () {
      const exec = makeExec({
        '/usr/bin/chrome': IS_WIN ? '135.0.7049.84' : 'Google Chrome 135.0.7049.84',
      });
      const version = await getBrowserVersion('/usr/bin/chrome', undefined, exec);
      expect(version).to.equal('135.0.7049.84');
    });

    it('parses Chromium/X.Y.Z.W format', async function () {
      const exec = makeExec({
        '/usr/bin/chromium': IS_WIN ? '135.0.7049.84' : 'Chromium/135.0.7049.84',
      });
      const version = await getBrowserVersion('/usr/bin/chromium', undefined, exec);
      expect(version).to.equal('135.0.7049.84');
    });

    it('parses Edge/X.Y.Z.W format', async function () {
      const exec = makeExec({
        '/usr/bin/msedge': IS_WIN ? '135.0.3179.85' : 'Microsoft Edge/135.0.3179.85',
      });
      const version = await getBrowserVersion('/usr/bin/msedge', undefined, exec);
      expect(version).to.equal('135.0.3179.85');
    });

    it('parses "Microsoft Edge X.Y.Z.W" format (no slash)', async function () {
      const exec = makeExec({
        '/usr/bin/msedge': IS_WIN ? '135.0.3179.85' : 'Microsoft Edge 135.0.3179.85',
      });
      const version = await getBrowserVersion('/usr/bin/msedge', undefined, exec);
      expect(version).to.equal('135.0.3179.85');
    });

    it('throws when the binary fails', async function () {
      const exec = makeExec({});
      await expect(getBrowserVersion('/nonexistent/chrome', undefined, exec)).to.be.rejectedWith(
        'Could not determine browser version',
      );
    });

    it('throws when stdout has no recognisable version string', async function () {
      const exec = makeExec({'/usr/bin/chrome': 'something unexpected'});
      await expect(getBrowserVersion('/usr/bin/chrome', undefined, exec)).to.be.rejectedWith(
        'Could not determine browser version',
      );
    });
  });

  describe('without a supplied chromeBinary (default candidates)', function () {
    it('returns the version from the first working candidate', async function () {
      // Simulate only the candidate for Chromium succeeding
      const exec: ExecFn = async (binary, args) => {
        const effectiveBinary = resolveEffectiveBinary(binary, args);
        if (effectiveBinary === 'google-chrome') {
          throw new Error('not found');
        }
        if (effectiveBinary.includes('Chromium') || effectiveBinary === 'chromium') {
          return {stdout: IS_WIN ? '135.0.7049.0' : 'Chromium/135.0.7049.0'};
        }
        throw new Error('not found');
      };
      const version = await getBrowserVersion(undefined, undefined, exec);
      expect(version).to.equal('135.0.7049.0');
    });

    it('supports beta/dev channel candidates as fallback', async function () {
      const channelCandidate = IS_WIN
        ? '\\Google\\Chrome Beta\\Application\\chrome.exe'
        : process.platform === 'darwin'
          ? '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta'
          : 'google-chrome-beta';

      const exec: ExecFn = async (binary, args) => {
        const effectiveBinary = resolveEffectiveBinary(binary, args);
        if (
          (IS_WIN && effectiveBinary.includes(channelCandidate)) ||
          (!IS_WIN && effectiveBinary === channelCandidate)
        ) {
          return {stdout: IS_WIN ? '136.0.7103.10' : 'Google Chrome 136.0.7103.10'};
        }
        throw new Error('not found');
      };

      const version = await getBrowserVersion(undefined, undefined, exec);
      expect(version).to.equal('136.0.7103.10');
    });

    it('throws when no candidate succeeds', async function () {
      const exec: ExecFn = async () => {
        throw new Error('not found');
      };
      await expect(getBrowserVersion(undefined, undefined, exec)).to.be.rejectedWith(
        'Could not determine browser version',
      );
    });
  });

  describe('browserName filtering', function () {
    it('only checks Chrome/Chromium candidates when browserName is "chrome"', async function () {
      const visited: string[] = [];
      const exec: ExecFn = async (binary, args) => {
        visited.push(resolveEffectiveBinary(binary, args));
        throw new Error('not found');
      };
      await getBrowserVersion(undefined, 'chrome', exec).catch(() => {});
      expect(visited.some((b) => /edge/i.test(b))).to.be.false;
    });

    it('only checks Chrome/Chromium candidates when browserName is "chromium"', async function () {
      const visited: string[] = [];
      const exec: ExecFn = async (binary, args) => {
        visited.push(resolveEffectiveBinary(binary, args));
        throw new Error('not found');
      };
      await getBrowserVersion(undefined, 'chromium', exec).catch(() => {});
      expect(visited.some((b) => /edge/i.test(b))).to.be.false;
    });

    it('only checks Edge candidates when browserName is "msedge"', async function () {
      const visited: string[] = [];
      const exec: ExecFn = async (binary, args) => {
        visited.push(resolveEffectiveBinary(binary, args));
        throw new Error('not found');
      };
      await getBrowserVersion(undefined, 'msedge', exec).catch(() => {});
      expect(visited.every((b) => /edge/i.test(b))).to.be.true;
    });
  });
});
