---
title: Other Browsers
---

The Chromium driver theoretically supports automating any Chromium-based browser, not just Chrome
and Edge.

!!! warning

    Other browsers may not be fully compatible with the Chromium driver. They may require additional
    workarounds not listed in this guide, or may not support `chromedriver` at all (e.g. Vivaldi).

## Configuration

Usually, no configuration is required in the browser itself. The main differences from regular
Chrome/Edge are in the required capabilities:

* The target browser must be specified by customizing the path to the browser binary, using the [`goog:chromeOptions`](../reference/capabilities.md#google-specific) capability
* Most browsers will require the [`appium:executable`](../reference/capabilities.md#appium-specific) capability in order to specify a compatible `chromedriver` binary
    * The browser's Chromium version can usually be found in its About page. You can then download a compatible `chromedriver` binary either manually or using the [`install-chromedriver`](../reference/scripts.md) driver script. Note that there may not always be a binary with the exact same version as Chromium, but the closest match should still work.

### Background

For browsers like Chrome and Edge, the Chromium driver can automatically verify version
compatibility with `chromedriver`/`edgedriver`, since the browser and driver binaries are released
by the same vendor, and both have matching major versions. But for other browsers, the browser
version will likely be different from the bundled Chromium version.

The way that the Chromium driver detects the browser version is by simply executing the browser
binary with the `--version` flag (on Windows this approach is slightly more complex). If the major
version in this returned value is different from the internal Chromium version, then the Chromium
driver will simply download an incompatible `chromedriver` version, and session creation will fail.
The way to solve this problem is to explicitly provide a path to a compatible `chromedriver` binary.

## Examples

The Opera browser does not expose its Chromium version, so the `chromedriver` path must be provided.
The following capabilities can be used to launch Opera on macOS:

```json
{
  "platformName": "mac",
  "appium:automationName": "Chromium",
  "appium:executable": "/path/to/compatible/chromedriver",
  "goog:chromeOptions": {
    "binary": "/Applications/Opera.app/Contents/MacOS/Opera"
  }
}
```

!!! info

    Opera also maintains its own [OperaChromiumDriver](https://github.com/operasoftware/operachromiumdriver),
    which may provide better compatibility than standard ChromeDriver.

The Brave browser uses a custom approach and exposes both Chromium's and its own version (e.g.
Brave 1.91.180 bundles Chromium 149, returning version 149.1.91.180). In practice this means that
the `chromedriver` path can be omitted. The following capabilities can be used to launch Brave on
macOS:

```json
{
  "platformName": "mac",
  "appium:automationName": "Chromium",
  "goog:chromeOptions": {
    "binary": "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  }
}
```
