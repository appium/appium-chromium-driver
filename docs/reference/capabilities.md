---
title: Capabilities
---

This page lists various capabilities used and implemented by the Chromium driver. To learn more
about capabilities, refer to the [Appium documentation](https://appium.io/docs/en/latest/guides/caps/).

For other capabilities recognized by the Appium server, see
[their Appium docs reference page](https://appium.io/docs/en/latest/reference/session/caps/).

## Standard

Refer to [the W3C WebDriver documentation](https://w3c.github.io/webdriver/#capabilities)
for more information about these capabilities.

### platformName

| Name | Type | Default |
| -- | -- | -- |
| `platformName` | `string` | Not specified |

This capability be set to `mac`, `linux` or `windows` (case-insensitive)

### browserName

| Name | Type | Default |
| -- | -- | -- |
| `browserName` | `string` | Not specified |

Must be set to `MicrosoftEdge` (case-sensitive) if automating MS Edge. Can be left unset for other
Chromium-based browsers.

## General

### automationName

| Name | Type | Default |
| -- | -- | -- |
| `appium:automationName` | `string` | Not specified |

Specifies the Appium driver to use. Must be set to `Chromium` (case-insensitive)

## Google

### chromeOptions

| Name | Type | Default |
| -- | -- | -- |
| `goog:chromeOptions` | `Record<string, any>` | Not specified |

Chrome-specific capabilities. [Refer to the ChromeDriver documentation](https://developer.chrome.com/docs/chromedriver/capabilities#recognized_capabilities)
for more details.

## Microsoft

### edgeOptions

| Name | Type | Default |
| -- | -- | -- |
| `ms:edgeOptions` | `Record<string, any>` | Not specified |

Microsoft Edge-specific capabilities. [Refer to the EdgeDriver documentation](https://learn.microsoft.com/en-us/microsoft-edge/webdriver/capabilities-edge-options#recognized-capabilities)
for more details.

## Chromedriver / Edgedriver

### chromedriverPort

| Name | Type | Default |
| -- | -- | -- |
| `appium:chromedriverPort` | `number` | `9515` |

The port to use for starting `chromedriver`/`msedgedriver`

### executable

| Name | Type | Default |
| -- | -- | -- |
| `appium:executable` | `string` | Not specified |

Custom path to a `chromedriver`/`msedgedriver` binary

### executableDir

| Name | Type | Default |
| -- | -- | -- |
| `appium:executableDir` | `string` | Not specified |

Custom path to a directory containing `chromedriver`/`msedgedriver` binaries

### verbose

| Name | Type | Default |
| -- | -- | -- |
| `appium:verbose` | `boolean` | `false` |

Whether to enable verbose logging. Maps to the `--verbose` flag of the `chromedriver`/`msedgedriver`
binary.

### logPath

| Name | Type | Default |
| -- | -- | -- |
| `appium:logPath` | `string` | Not specified |

If specified, log output will be written to the file on this path, instead of the default logger.
Maps to the `--log-path` flag of the `chromedriver`/`msedgedriver` binary.

### disableBuildCheck

| Name | Type | Default |
| -- | -- | -- |
| `appium:disableBuildCheck` | `boolean` | `false` |

Whether to disable the check that requires `chromedriver`/`msedgedriver` and the browser executable
to have matching versions. Maps to the `--disable-build-check` flag of the
`chromedriver`/`msedgedriver` binary.

### autodownloadEnabled

| Name | Type | Default |
| -- | -- | -- |
| `appium:autodownloadEnabled` | `boolean` | `true` |

Whether to automatically download a compatible `chromedriver`/`msedgedriver` when starting a new
session

### useSystemExecutable

| Name | Type | Default |
| -- | -- | -- |
| `appium:useSystemExecutable` | `boolean` | `false` |

Whether to use the `chromedriver` binary bundled with Chromium driver.

This capability is primarily relevant for Chromium driver versions 1.3.35 or earlier, which
automatically downloaded `chromedriver` upon installation.
