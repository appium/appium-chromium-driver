// @ts-check

'use strict';

module.exports = {
  require: ['ts-node/register'],
  // forbids use of .only() in CI
  forbidOnly: Boolean(process.env.CI),
  color: true,
  // increase default timeout for CI since it can be slow
  timeout: process.env.CI ? '120s' : '45s',
};
