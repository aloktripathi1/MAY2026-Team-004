const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customJestConfig = {
  displayName: "components",
  rootDir: "../",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/components/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/config/jest.components.setup.js"],
};

module.exports = createJestConfig(customJestConfig);
