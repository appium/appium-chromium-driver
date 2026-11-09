import {net, system, tempDir, zip} from 'appium/support.js';

// Appium 4 exposes these as read-only ES namespaces; this plain object lets unit tests stub them.
export const support = {
  isWindows: system.isWindows,
  downloadFile: net.downloadFile,
  openTempDir: tempDir.openDir,
  extractAllTo: zip.extractAllTo,
};
