import {mock} from 'node:test';

import * as chromedriver from 'appium-chromedriver';
import * as real from 'appium/support.js';
import sinon from 'sinon';
import * as realTeenProcess from 'teen_process';

// Appium 4 exposes system as a read-only ES namespace, so they can only be mocked at module level.
// Import this file first, then load the code under test via dynamic import().
export const installDriverFromArchiveStub = sinon.stub();

export const execStub = sinon.stub();

export const supportStubs = {
  isWindows: sinon.stub(),
};

/** Reset call history and make every stub delegate to the real implementation again. */
export function resetModuleMocks(): void {
  installDriverFromArchiveStub.reset();
  execStub.reset();
  execStub.callsFake(realTeenProcess.exec);
  supportStubs.isWindows.reset();
  supportStubs.isWindows.callsFake(real.system.isWindows);
}

resetModuleMocks();

// Node 22 rejects a `default` key in namedExports, so pass it separately.
function withoutDefault<T extends {default?: unknown}>(ns: T): Omit<T, 'default'> {
  const {default: _default, ...rest} = ns;
  return rest;
}
mock.module('appium-chromedriver', {
  defaultExport: chromedriver.default,
  namedExports: {...withoutDefault(chromedriver), installDriverFromArchive: installDriverFromArchiveStub},
});

mock.module('appium/support.js', {
  defaultExport: real.default,
  namedExports: {
    ...withoutDefault(real),
    system: {...real.system, isWindows: supportStubs.isWindows},
  },
});

mock.module('teen_process', {
  namedExports: {...realTeenProcess, exec: execStub},
});
