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

Allows running custom `chromedriver`/`msedgedriver` executables that are not limited to the
official binaries distributed by Google/Microsoft.

By default, the driver checks each executable against the SHA-256 checksums shipped with
[`appium-chromedriver`](https://github.com/appium/appium-android/tree/main/packages/chromedriver#executable-verification).

- **ChromeDriver:** Checksums are recorded for each downloaded binary, including downloads made by
  the [`install-chromedriver`](./scripts.md#install-chromedriver) script. This allows the driver to
  run such binaries even before their checksums ship with `appium-chromedriver`.
- **Edge WebDriver:** Checksums for downloads are not recorded. If a downloaded build is missing
  from the shipped checksums, session creation fails verification. To use that build with
  verification enabled, update to a version of `appium-chromedriver` that includes its checksum.

The same verification applies to executables supplied via [`appium:executable`](./capabilities.md#executable)
or [`appium:executableDir`](./capabilities.md#executabledir). Running a binary with an unrecognized
checksum requires enabling this feature.

!!! warning

    With this feature enabled, any client that is able to create a session can make the server run an
    arbitrary executable from the host file system. Only enable it if you trust all your clients.
