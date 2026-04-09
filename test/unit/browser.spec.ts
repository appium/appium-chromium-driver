import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {getBrowserVersion} from '../../lib/browser';

use(chaiAsPromised);

type ExecFn = (binary: string, args: string[]) => Promise<{stdout: string}>;

function makeExec(outputs: Record<string, string>): ExecFn {
  return async (binary: string) => {
    if (binary in outputs) {
      return {stdout: outputs[binary]};
    }
    throw new Error(`${binary}: not found`);
  };
}

describe('getBrowserVersion', function () {
  describe('with a supplied chromeBinary', function () {
    it('parses Chrome/X.Y.Z.W format', async function () {
      const exec = makeExec({'/usr/bin/chrome': 'Google Chrome/135.0.7049.84'});
      const version = await getBrowserVersion('/usr/bin/chrome', exec);
      expect(version).to.equal('135.0.7049.84');
    });

    it('parses "Google Chrome X.Y.Z.W" format (no slash)', async function () {
      const exec = makeExec({'/usr/bin/chrome': 'Google Chrome 135.0.7049.84'});
      const version = await getBrowserVersion('/usr/bin/chrome', exec);
      expect(version).to.equal('135.0.7049.84');
    });

    it('parses Chromium/X.Y.Z.W format', async function () {
      const exec = makeExec({'/usr/bin/chromium': 'Chromium/135.0.7049.84'});
      const version = await getBrowserVersion('/usr/bin/chromium', exec);
      expect(version).to.equal('135.0.7049.84');
    });

    it('parses Edge/X.Y.Z.W format', async function () {
      const exec = makeExec({'/usr/bin/msedge': 'Microsoft Edge/135.0.3179.85'});
      const version = await getBrowserVersion('/usr/bin/msedge', exec);
      expect(version).to.equal('135.0.3179.85');
    });

    it('parses "Microsoft Edge X.Y.Z.W" format (no slash)', async function () {
      const exec = makeExec({'/usr/bin/msedge': 'Microsoft Edge 135.0.3179.85'});
      const version = await getBrowserVersion('/usr/bin/msedge', exec);
      expect(version).to.equal('135.0.3179.85');
    });

    it('throws when the binary fails', async function () {
      const exec = makeExec({});
      await expect(getBrowserVersion('/nonexistent/chrome', exec)).to.be.rejectedWith(
        'Could not determine Chrome version',
      );
    });

    it('throws when stdout has no recognisable version string', async function () {
      const exec = makeExec({'/usr/bin/chrome': 'something unexpected'});
      await expect(getBrowserVersion('/usr/bin/chrome', exec)).to.be.rejectedWith(
        'Could not determine Chrome version',
      );
    });
  });

  describe('without a supplied chromeBinary (default candidates)', function () {
    it('returns the version from the first working candidate', async function () {
      // Simulate only the second candidate succeeding
      const exec: ExecFn = async (binary) => {
        if (binary === 'google-chrome') {
          throw new Error('not found');
        }
        if (binary.includes('Chromium') || binary === 'chromium') {
          return {stdout: 'Chromium/135.0.7049.0'};
        }
        throw new Error('not found');
      };
      const version = await getBrowserVersion(undefined, exec);
      expect(version).to.equal('135.0.7049.0');
    });

    it('supports beta/dev channel candidates as fallback', async function () {
      const channelCandidate =
        process.platform === 'win32'
          ? '\\Google\\Chrome Beta\\Application\\chrome.exe'
          : process.platform === 'darwin'
            ? '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta'
            : 'google-chrome-beta';

      const exec: ExecFn = async (binary) => {
        if (
          (process.platform === 'win32' && binary.includes(channelCandidate)) ||
          (process.platform !== 'win32' && binary === channelCandidate)
        ) {
          return {stdout: 'Google Chrome 136.0.7103.10'};
        }
        throw new Error('not found');
      };

      const version = await getBrowserVersion(undefined, exec);
      expect(version).to.equal('136.0.7103.10');
    });

    it('throws when no candidate succeeds', async function () {
      const exec: ExecFn = async () => {
        throw new Error('not found');
      };
      await expect(getBrowserVersion(undefined, exec)).to.be.rejectedWith(
        'Could not determine Chrome version',
      );
    });
  });
});
