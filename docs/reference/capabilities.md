---
title: Capabilities
---

This page lists various capabilities used and implemented by the Chromium driver. To learn more
about capabilities, refer to the [Appium documentation](https://appium.io/docs/en/latest/guides/caps/).

For other capabilities recognized by the Appium server, see
[their Appium docs reference page](https://appium.io/docs/en/latest/reference/session/caps/).

## Standard

| Capability | Description |
| --- | --- |
| `platformName` | Must be set to `mac`, `linux` or `windows` |
| `browserName` | Must be set to `MicrosoftEdge` if automating MS Edge. Automatically set to `chrome` if omitted |

## Appium-Specific

| <div style="width:14em">Capability</div> | Description | Default |
| --- | --- | --- |
| `appium:automationName` | Must be set to `Chromium` | |
| `appium:chromedriverPort` | The port to use for starting `chromedriver`/`msedgedriver` | 9515 |
| `appium:executable` | Custom absolute path to a `chromedriver`/`msedgedriver` binary | |
| `appium:executableDir` | Custom absolute path to a directory containing `chromedriver`/`msedgedriver` binaries | |
| `appium:verbose` | Whether to add the `--verbose` flag when launching `chromedriver`/`msedgedriver` | false |
| `appium:logPath` | Value of the `--log-path` parameter provided to `chromedriver`/`msedgedriver` | |
| `appium:disableBuildCheck` | Whether to add the `--disable-build-check` flag when launching `chromedriver`/`msedgedriver` | false |
| `appium:autodownloadEnabled` | Whether to automatically download a compatible `chromedriver`/`msedgedriver` when starting a session | true |
| `appium:useSystemExecutable` | Whether to use the `chromedriver` binary bundled with Chromium driver. Primarily relevant for Chromium driver versions 1.3.35 or earlier, which automatically downloaded `chromedriver` upon installation. | false |

## Google-Specific

| <div style="width:10em">Capability</div> | Description |
| --- | --- |
| `goog:chromeOptions` | Chrome-specific capabilities. [Refer to the ChromeDriver documentation](https://developer.chrome.com/docs/chromedriver/capabilities#recognized_capabilities) for more details. |

## Microsoft-Specific

| Capability | Description |
| --- | --- |
| `ms:edgeOptions` | Edge-specific capabilities. [Refer to the EdgeDriver documentation](https://learn.microsoft.com/en-us/microsoft-edge/webdriver/capabilities-edge-options#recognized-capabilities) for more details. |
