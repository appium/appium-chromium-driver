import {mock} from 'node:test';

import * as real from 'appium/support.js';
import sinon from 'sinon';
import * as realTeenProcess from 'teen_process';

// Appium 4 exposes net/system/tempDir/zip as read-only ES namespaces, so they can only be mocked at module level.
// Import this file first, then load the code under test via dynamic import().
export const execStub = sinon.stub();

export const supportStubs = {
  isWindows: sinon.stub(),
  downloadFile: sinon.stub(),
  openTempDir: sinon.stub(),
  extractAllTo: sinon.stub(),
};

/** Reset call history and make every stub delegate to the real implementation again. */
export function resetModuleMocks(): void {
  execStub.reset();
  execStub.callsFake(realTeenProcess.exec);
  supportStubs.isWindows.reset();
  supportStubs.isWindows.callsFake(real.system.isWindows);
  supportStubs.downloadFile.reset();
  supportStubs.downloadFile.callsFake(real.net.downloadFile);
  supportStubs.openTempDir.reset();
  supportStubs.openTempDir.callsFake(real.tempDir.openDir);
  supportStubs.extractAllTo.reset();
  supportStubs.extractAllTo.callsFake(real.zip.extractAllTo);
}

resetModuleMocks();

mock.module('appium/support.js', {
  namedExports: {
    ...real,
    system: {...real.system, isWindows: supportStubs.isWindows},
    net: {...real.net, downloadFile: supportStubs.downloadFile},
    tempDir: {...real.tempDir, openDir: supportStubs.openTempDir},
    zip: {...real.zip, extractAllTo: supportStubs.extractAllTo},
  },
});

mock.module('teen_process', {
  namedExports: {...realTeenProcess, exec: execStub},
});
