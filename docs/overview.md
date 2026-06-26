---
hide:
  - navigation
  - toc

title: Overview
---

The Chromium driver is an Appium driver intended for black-box automated testing of Chromium-based
desktop browsers.

## Target Platforms

The driver supports the following platforms as automation targets:

|Platform|Supported|
|--|--|
|Google Chrome|:white_check_mark:|
|Google Chrome (Android)|:x: [^chrome-android]|
|Google Chrome (iOS)|:x: [^chrome-ios]|
|Microsoft Edge|:white_check_mark: [^edge-desktop]|
|Microsoft Edge (Android)|:x: [^edge-android]|
|Microsoft Edge (iOS)|:x: [^edge-ios]|
|ChromeOS|:x:|

The driver also permits automating other Chromium-based desktop browsers (Brave, Opera, etc.).
Refer to the [Other Browsers guide](./guides/other-browsers.md) for more details.

## Technologies Used

The Chromium driver uses the [W3C WebDriver protocol](https://www.w3.org/TR/webdriver/) for session
management. Under the hood, the driver relies on the [`appium-chromedriver`](https://github.com/appium/appium-chromedriver)
package, which is a wrapper/proxy over Google's `chromedriver` and Microsoft's `msedgedriver`
binaries.

* For more information about ChromeDriver, [refer to its documentation](https://developer.chrome.com/docs/chromedriver)
* For more information about EdgeDriver, refer to [the Microsoft Edge guide](./guides/ms-edge.md)

[^chrome-android]: Supported by the [UiAutomator2 driver](https://github.com/appium/appium-uiautomator2-driver)
[^chrome-ios]: Supported by the [Safari](https://github.com/appium/appium-safari-driver) and [XCUITest](https://appium.github.io/appium-xcuitest-driver/latest/) drivers
[^edge-desktop]: Refer to the [Microsoft Edge guide](./guides/ms-edge.md) for more details
[^edge-android]: [Refer to this feature request](https://github.com/MicrosoftEdge/DevTools/issues/435)
[^edge-ios]: [Refer to this feature request](https://github.com/MicrosoftEdge/DevTools/issues/266)
