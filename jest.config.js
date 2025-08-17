const isCI = process.env.GITHUB_ACTIONS === 'true';

module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['lib/**/*.js', 'routes/**/*.js', 'src/**/*.js'],
  testPathIgnorePatterns: ['/node_modules/', '/thechattyai-frontend/', '/.next/'],
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