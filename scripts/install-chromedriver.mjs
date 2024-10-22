import { ChromedriverStorageClient } from 'appium-chromedriver';

function getChromedriverVersion() {
    return process.env.CHROMEDRIVER_VERSION;
}

function getExecutableDir() {
  return process.env.CHROMEDRIVER_EXECUTABLE_DIR;
}

async function install () {
  const client = new ChromedriverStorageClient({
    chromedriverDir: getExecutableDir(),
  });
  const chromeDriverVersion = getChromedriverVersion() || await client.getLatestKnownGoodVersion();
  await client.syncDrivers({
    versions: [chromeDriverVersion],
  });
}

(async () => await install())();
