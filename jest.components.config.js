const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customJestConfig = {
  displayName: "components",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/components/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.components.setup.js"],
};

module.exports = createJestConfig(customJestConfig);
