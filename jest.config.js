const isCI = process.env.GITHUB_ACTIONS === 'true';

const baseIgnore = ['/node_modules/', '/thechattyai-frontend/', '/.next/'];
const ciOnlyIgnore = isCI ? ['tests/grok-service.test.js', 'tests/call-data-storage.test.js'] : [];

module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['lib/**/*.js', 'routes/**/*.js', 'src/**/*.js'],
  testPathIgnorePatterns: [...baseIgnore, ...ciOnlyIgnore],
  modulePathIgnorePatterns: ['thechattyai-frontend', '.next'],
  watchPathIgnorePatterns: ['/thechattyai-frontend/', '/.next/'],
  moduleNameMapper: {
    '^@sendgrid/mail$': '<rootDir>/tests/__mocks__/sendgrid.js'
  },
  coverageThreshold: isCI
    ? {}
    : {
        global: {
          branches: 80,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
};