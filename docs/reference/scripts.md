---
hide:
  - toc

title: Scripts
---

Appium drivers can include scripts for executing specific actions. The scripts included in the
Chromium driver can be run as follows:

```
appium driver run chromium <script-name>
```

For more information about the `appium driver run` command, refer to [the Appium docs](https://appium.io/docs/en/latest/reference/cli/extensions/#run).

### `install-chromedriver`

Downloads and installs a `chromedriver` server binary. By default, [the last known good stable version](https://github.com/GoogleChromeLabs/chrome-for-testing#json-api-endpoints)
for the current host platform is installed. This behavior can be adjusted with [environment variables listed below](#optional-environment-variables).

#### Usage

```
appium driver run chromium install-chromedriver
```

##### Optional Environment Variables

|<div style="width:15em">Variable</div>|<div style="width:22em">Description</div>|Default|
|--|--|--|
|`CHROMEDRIVER_VERSION`|Specific version of `chromedriver` to download|Latest known good stable|
|`CHROMEDRIVER_EXECUTABLE_DIR`|Directory where the binary should be installed|The `chromedrivers` directory under [`envPaths('appium-chromium-driver').data`](https://github.com/sindresorhus/env-paths#pathsdata)|
|`CHROMEDRIVER_CDNURL`|Custom CDN to use for downloading binary versions below 115|https://chromedriver.storage.googleapis.com|
|`CHROMELABS_URL`|Custom CDN to use for downloading binary version 115 or above|https://googlechromelabs.github.io|

Refer to the [`appium-chromedriver` documentation](https://github.com/appium/appium-chromedriver#custom-binaries-url)
for more information about the latter two variables.

#### Examples

- Install the latest known good stable version of `chromedriver`:

    ```
    appium driver run chromium install-chromedriver
    ```

- Install `chromedriver` version `124.0.6367.0`:

    ```
    CHROMEDRIVER_VERSION=124.0.6367.0 appium driver run chromium install-chromedriver
    ```

- Install the latest known good stable version of `chromedriver` in a custom directory:

    ```
    CHROMEDRIVER_EXECUTABLE_DIR=/my/custom/directory appium driver run chromium install-chromedriver
    ```
