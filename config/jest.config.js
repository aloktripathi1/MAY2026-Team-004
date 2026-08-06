const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customJestConfig = {
  displayName: "unit",
  rootDir: "../",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
};

module.exports = createJestConfig(customJestConfig);
