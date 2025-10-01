export default {
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['@swc/jest', {
      module: {
        type: 'es6'
      }
    }]
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverage: false,
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 10000,
  injectGlobals: true
};
