---
title: Microsoft Edge
---

The Chromium driver officially supports automating the Microsoft Edge browser.

## Requirements

Unlike Chrome and other Chromium-based browsers, which use the `chromedriver` binary for automation,
Microsoft Edge requires its own WebDriver binary, [Microsoft Edge WebDriver (also known as `msedgedriver`)](https://learn.microsoft.com/en-us/microsoft-edge/webdriver/).

The Chromium driver will automatically install a compatible `msedgedriver` binary upon starting a
new session (see [System Requirements](../getting-started/index.md#system-requirements)), but it is
also possible to download the binary manually, [as described in the official documentation](https://learn.microsoft.com/en-us/microsoft-edge/webdriver/#download-microsoft-edge-webdriver).

In addition to the dependency on `msedgedriver`, Microsoft Edge sessions require specific
capabilities:

* The `browserName` capability must be set to `MicrosoftEdge`
* Edge-specific options can be provided under the `ms:edgeOptions` capability

For more information on supported capabilities, see [the Capabilities reference page](../reference/capabilities.md).

## Examples

The following capability set can be used to start a basic Microsoft Edge session on macOS:

```json
{
  "platformName": "mac",
  "browserName": "MicrosoftEdge",
  "appium:automationName": "Chromium"
}
```

In order to test a specific browser version (such as in a continuous integration environment),
it is recommended to provide a path to the specific Microsoft Edge binary:

```json
{
  "platformName": "mac",
  "browserName": "MicrosoftEdge",
  "appium:automationName": "Chromium",
  "ms:edgeOptions": {
    "binary": "/path/to/edge"
  }
}
```