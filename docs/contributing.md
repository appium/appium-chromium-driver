---
hide:
  - navigation
  - toc

title: Contributing
---

Contributions to this project are welcome! To start off, clone it from GitHub and run:

```bash
npm install
```

To build the project:

```bash
npm run build
```

To run in development mode:

```bash
npm run dev
```

To run tests:

```bash
npm run test # unit 
npm run test:smoke
npm run test:e2e
```

There are also a number of environment variables that can be used when running the tests locally.
These include:

* `TEST_PLATFORM` - set the host platform (`mac` / `windows`/ `linux`)
* `TEST_PORT` - set the host port (default `4780`)
* `IS_MSEDGE` - whether tests should use Microsoft Edge instead of Google Chrome
* `MSEDGE_BIN` - set a custom path to the Microsoft Edge binary
* `CHROME_BIN` - set a custom path to the Google Chrome binary

To lint and format:

```bash
npm run lint:fix
npm run format
```

To develop documentation:

```bash
npm run install-docs-deps # install the dependencies (Python packages)
npm run dev:docs # serve the docs locally and watch for changes
```

Additional scripts can also be found in `package.json`.
