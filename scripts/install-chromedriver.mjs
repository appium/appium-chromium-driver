import _ from 'lodash';
import { ChromedriverStorageClient } from 'appium-chromedriver';
import axios from 'axios';

const VERSION_LATEST = 'LATEST';

function getChromedriverUrl() {
    return process.env.CHROMELABS_URL || 'https://googlechromelabs.github.io'
}

function getChromedriverVersion() {
    return process.env.npm_config_chromedriver_version ||
        process.env.CHROMEDRIVER_VERSION ||
        VERSION_LATEST;
}

function getExecutableDir() {
  return process.env.CHROMEDRIVER_EXECUTABLE_DIR || import.meta.dirname
}

async function formatCdVersion (ver) {
    if (_.toUpper(ver) !== VERSION_LATEST) {
      return ver;
    }
    let versions;
    const url = `${getChromedriverUrl()}/chrome-for-testing/last-known-good-versions.json`;
    try {
      versions = (await axios({
        url,
        headers: {
            'user-agent': 'appium',
            accept: `application/json, */*`,
          },
        timeout: 15000,
        responseType: 'text',
      })).json;
    } catch (e) {
      throw new Error(`Cannot fetch the latest Chromedriver version. ` +
        `Make sure you can access ${url} from your machine or provide a mirror by setting ` +
        `a custom value to CHROMELABS_URL enironment variable. Original error: ${err.message}`);
    }

    /**
     * "timestamp":"2024-10-20T20:09:22.942Z",
     * "channels":{
     *    "Stable":{
     *       "channel":"Stable",
     *       "version":"130.0.6723.58",
     *       "revision":"1356013"
     * ...
     */
    if (!versions?.channels?.Stable?.version) {
      throw new Error('The format of the storage JSON is not supported');
    }
    return versions.channels.Stable.version;
  }

async function install () {
  const client = new ChromedriverStorageClient({
    chromedriverDir: getExecutableDir(),
  });
  await client.syncDrivers({
    versions: [await formatCdVersion(getChromedriverVersion())],
  });
}

(async () => await install())();
