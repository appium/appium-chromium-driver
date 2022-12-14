# appium-chromium-driver

This is an [Appium](https://github.com/appium/appium) driver for Chromium-based browsers (like
Chrome).

### Why does this project exist?

It is already possible to automate Chromium browsers with
[Chromedriver](https://chromedriver.chromium.org/). In fact, this Appium driver uses Chromedriver
under the hood! It is not any kind of fundamentally new or different technology. The advantages of
using this project are:

- Automate Chromium browsers using the Appium server you already have, simply by including this
  Appium driver.
- No need to download specific versions of Chromedriver manually. This driver takes care of
  downloading a version of Chromedriver appropriate for the version of the browser under test.
- Take advantage of the ecosystem of Appium plugins and features (e.g., [image
  analysis](https://github.com/appium/appium/tree/master/packages/images-plugin)) not available via
  Chromedriver on its own.

## Installation

It's assumed that you have an Appium server (version 2.x+) installed, and that you have a browser
compatible with Chromedriver ready to automate on your system. The recommended installation method
is to use the [Appium extension
CLI](https://appium.github.io/appium/docs/en/latest/cli/extensions/) to install the driver:

```bash
appium driver install chromium
```

## Usage

To start an automation session targeting this driver, construct a set of options/capabilities in
any WebDriver client that (minimally) includes the following:

|Capability|Value|
|---|---|
|`platformName`|One of `macOS`, `Linux`, or `Windows` (depending on your system|
|`browserName`|`chrome`|
|`appium:automationName`|`Chromium`|

Use these capabilities to start a new session. (Refer to the documentation for your WebDriver
client for the particular syntax used to start a session in that client).

At this point, all WebDriver commands are proxied directly to Chromedriver. This driver does not
implement any additional commands. Refer to the Chromedriver documentation or the [WebDriver
specification](https://w3c.github.io/webdriver/) for a list of the available automation commands.

## Capabilities

In addition to all of the [Chromedriver
capabilities](https://chromedriver.chromium.org/capabilities) (nested underneath
`goog:chromeOptions`), this driver supports the following:

|Capability|Description|Default Value|
|---|---|---|
|`appium:chromedriverPort`|The port to start Chromedriver on|`9515`|
|`appium:executable`|The absolute path to a `chromedriver` binary executable. If set, the driver will use that path instead of its own Chromedriver||
|`appium:executableDir`|A directory within which is found any number of `chromedriver` binaries. If set, the driver will search this directory for Chromedrivers of the appropriate version to use for your browser||
|`appium:verbose`|Set to `true` to add the `--verbose` flag when starting Chromedriver|`false`|
|`appium:logPath`|The path to use with the `--log-path` parameter directing Chromedriver to write its log to that path, if set||
|`appium:disableBuildCheck`|Set to `true` to add the `--disable-build-check` flag when starting Chromedriver|`false`|
|`appium:autodownloadEnabled`|Set to `false` to disable automatic downloading of Chromedrivers|`true`|
|`appium:useSystemExecutable`|Set to `true` to use the version of Chromedriver bundled with this driver, rather than attempting to download a new one based on the version of the browser under test|`false`|

## Contributing

Contributions to this project are welcome! Feel free to submit a PR on GitHub.

To get set up with a working developer environment, clone the project then run:

```bash
npm install
```

To build the code once:

```bash
npm run build
```

To rebuild the code anytime a file is saved:

```bash
npm run dev
```

Before committing any code, please make sure to run:

```bash
npm run lint
npm run test:ci
```

And make sure everything passes!

More developer scripts can be found in `package.json`.
