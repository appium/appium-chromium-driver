---
hide:
  - toc

title: Other Browsers
---

The Chromium driver theoretically supports automating any Chromium-based browser, not just Chrome
and Edge. This can be achieved by customizing the path to the browser binary, using the [`goog:chromeOptions`](../reference/capabilities.md#google-specific)
capability.

!!! warning

    Other browsers may not be fully compatible with the Chromium driver and may require workarounds.
    Only Chrome and Edge have been confirmed to work.

For example, in order to launch the Brave browser on macOS, you could use the following capabilities:

```json
{
  "platformName": "mac",
  "appium:automationName": "Chromium",
  "goog:chromeOptions": {
    "binary": "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  }
}
```
