---
title: Insecure Features
---

Some [insecure driver features](https://appium.io/docs/en/latest/guides/security/) are disabled by
default. They can be enabled upon launching Appium as follows:
```
appium --allow-insecure chromium:<feature-name>
```
or
```
appium --relaxed-security
```

For other insecure feature names recognized by the Appium server, see
[their Appium docs reference page](https://appium.io/docs/en/latest/reference/cli/insecure-features/).

## `chromedriver_allow_any_executable`

Allows running any `chromedriver`/`msedgedriver` executable, skipping the verification of its
SHA-256 checksum.

By default, the driver only runs executables that are builds distributed by Google (`chromedriver`)
or Microsoft (`msedgedriver`), according to the checksums shipped with the
[`appium-chromedriver`](https://github.com/appium/appium-android/tree/main/packages/chromedriver#executable-verification)
package, or whose checksums were recorded when the driver downloaded them from Google or Microsoft
(including ChromeDriver binaries installed with the
[`install-chromedriver`](./scripts.md#install-chromedriver) script). This also applies to the executables
provided via the [`appium:executable`](./capabilities.md#executable) and
[`appium:executableDir`](./capabilities.md#executabledir) capabilities. Custom or self-built binaries
and other builds with unrecognized checksums require this feature to be enabled.

!!! warning

    With this feature enabled, any client that is able to create a session can make the server run an
    arbitrary executable from the host file system. Only enable it if you trust all your clients.

Available since driver version 5.0.0.
