---
hide:
  - navigation

title: Getting Started
---

## System Requirements

There are four primary requirements to use the Chromium driver:

* macOS, Windows or Linux host machine
* Appium
* Chromium-based desktop web browser
* `chromedriver` or `msedgedriver` binary accessible from the host machine PATH
    * Since Chromium driver version 2.2.0, when starting a new session, a compatible binary will be automatically downloaded if required. This can be changed using the [`appium:autodownloadEnabled` capability](../reference/capabilities.md).
    * For `chromedriver`, since Chromium driver version 1.4.0, you can also use the [`install-chromedriver`](../reference/scripts.md) driver script to download and set up the binary in advance. [Manual `chromedriver` downloads can also be found here](https://googlechromelabs.github.io/chrome-for-testing/).
    * For `msedgedriver`, [manual downloads can also be found here](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/#downloads).

### Appium Server

Make sure to install a version of Appium that supports your target driver version. The requirements
and prerequisites of Appium itself can be found in [the Appium documentation](https://appium.io/docs/en/latest/quickstart/requirements/).

| Chromium driver version | Supported Appium server version |
| --- | --- |
| >= 2.0.0 | Appium 3 |
| 1.0.0 - 1.5.1 | Appium 2 |

## Installation

Provided you have set up the above prerequisites, you can install the driver using Appium's
[extension CLI](https://appium.io/docs/en/latest/cli/extensions/):

```bash
appium driver install chromium
```

You can also specify an exact driver version:

```bash
appium driver install chromium@2.2.0
```

Alternatively, if you are running a Node.js project, you can include `appium-chromium-driver` as
one of your project dependencies. [Refer to the Appium documentation](https://appium.io/docs/en/latest/guides/managing-exts/#do-it-yourself-with-npm)
for more information about this approach.

### Verify the Installation

In order to check that the driver was installed correctly, simply launch the Appium server:

```bash
appium
```

The server log output should include a line like the following:

```
[Appium] ChromiumDriver has been successfully loaded in 0.789s
```

## Creating a Session

The Chromium driver, like all Appium drivers, requires providing [specific capabilities](https://appium.io/docs/en/latest/guides/caps/)
in order to start a new session. The following example lists the minimum required capabilities for
a basic session:

```json
// This will launch Chrome on the host machine and attach to it
{
  ...
  "platformName": "mac", // "mac", "windows", or "linux"
  "appium:automationName": "chromium",
  ...
}
```

See [the Capabilities reference page](../reference/capabilities.md) for more information on the
capabilities supported by the driver.
