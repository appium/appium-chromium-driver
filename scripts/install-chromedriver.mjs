import {ChromedriverStorageClient} from 'appium-chromedriver';
import {getDefaultChromeDriverDir} from '../build/lib/utils/index.js';

function getChromedriverVersion() {
  return process.env.CHROMEDRIVER_VERSION;
}

function getExecutableDir() {
  return process.env.CHROMEDRIVER_EXECUTABLE_DIR || getDefaultChromeDriverDir();
}

async function install() {
  const client = new ChromedriverStorageClient({
    chromedriverDir: getExecutableDir(),
  });
  const chromeDriverVersion = getChromedriverVersion() || (await client.getLatestKnownGoodVersion());
  await client.syncDrivers({
    versions: [chromeDriverVersion],
  });
}

await install();
