import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {ChromiumDriver} from '../../lib/driver.js';

describe('driver', () => {
  it('exports ChromiumDriver', () => {
    assert.ok(new ChromiumDriver({} as any));
  });

  it('keeps Chrome executable unresolved when no explicit executable set', async () => {
    class TestDriver extends ChromiumDriver {
      setOpts(opts: Record<string, any>): void {
        Object.assign(this.opts, opts);
      }
      getExecutableExposed(): Promise<string | undefined> {
        return (this as any).getExecutable();
      }
    }

    const driver = new TestDriver({} as any);
    driver.setOpts({browserName: 'chrome'});
    assert.equal(await driver.getExecutableExposed(), undefined);
  });
});
