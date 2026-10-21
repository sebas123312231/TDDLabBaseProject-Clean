const unit = require('./jest.config.cjs')

/** @type {import('jest').Config} */
module.exports = {
  ...unit,
  moduleNameMapper: {
    '^\\.\\./src/app\\.js$': '<rootDir>/apps/api/dist/app.js',
    '^\\.\\./src/auth/access-token\\.js$': '<rootDir>/apps/api/dist/auth/access-token.js',
    ...unit.moduleNameMapper,
  },
  testMatch: ['<rootDir>/apps/api/test/*.integration.ts'],
  testTimeout: 30000,
}
