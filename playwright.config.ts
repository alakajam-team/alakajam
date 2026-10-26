import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:8001";

export default defineConfig({
  testDir: "e2e/tests",
  outputDir: "e2e/test-results",

  // All tests share a single server and database, which gets restored between tests
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "e2e/playwright-report", open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],

  webServer: {
    command: "npm run start:e2e",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
