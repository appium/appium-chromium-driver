---
hide:
  - toc

title: Microsoft Edge
---

The Chromium driver supports automating the Microsoft Edge browser since version 1.1.0.

Unlike Chrome and other Chromium-based browsers, which use the `chromedriver` binary for automation,
Microsoft Edge requires its own WebDriver binary, [Microsoft Edge WebDriver (also known as `msedgedriver`)](https://learn.microsoft.com/en-us/microsoft-edge/webdriver/).
The Chromium driver will automatically install a compatible `msedgedriver` binary upon starting a
new session (see [System Requirements](../getting-started/index.md#system-requirements)), but you
can also download the binary manually, [as described in the official documentation](https://learn.microsoft.com/en-us/microsoft-edge/webdriver/#download-microsoft-edge-webdriver).

In addition to the dependency on `msedgedriver`, Microsoft Edge sessions require specific
capabilities:

* The `browserName` capability must be set to `MicrosoftEdge`
* Edge-specific options can be provided under the `ms:edgeOptions` capability

For more information on supported capabilities, refer to [the Capabilities documentation](../reference/capabilities.md).

For example, to start a basic Microsoft Edge session on macOS, you could use the following
capability set:

```json
{
  "platformName": "mac",
  "browserName": "MicrosoftEdge",
  "appium:automationName": "Chromium"
}
```

If you need to test a specific browser version (such as in a continuous integration environment),
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