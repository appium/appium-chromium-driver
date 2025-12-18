import type {Constraints} from '@appium/types';

export const desiredCapConstraints = {
  chromedriverPort: {
    isNumber: true,
  },
  useSystemExecutable: {
    isBoolean: true,
  },
  executable: {
    isString: true,
  },
  executableDir: {
    isString: true,
  },
  verbose: {
    isBoolean: true,
  },
  logPath: {
    isString: true,
  },
  autodownloadEnabled: {
    isBoolean: true,
  },
  disableBuildCheck: {
    isBoolean: true,
  },
  browserName: {
    isString: true,
  },
} as const satisfies Constraints;

export type CDConstraints = typeof desiredCapConstraints;

