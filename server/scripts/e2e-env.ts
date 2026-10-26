/**
 * Forces the end-to-end test configuration.
 * Must be imported before any module that reads the config: ES imports are evaluated before the importing module's body.
 */

process.env.CONFIG_PATH = "server/scripts/e2e-config.js";
