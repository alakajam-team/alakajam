// tslint:disable: no-console

/**
 * Polls a URL until it reponds
 * Usage: node pollurl.js url [timeout]
 */

const requestRetry = require("requestretry");

const urlToPoll = process.argv[2];
const timeout = parseInt(process.argv[3] || "30", 10);

if (!urlToPoll) {
  console.error("No polling URL set");
  process.exit(1);
}

console.log(`Polling ${urlToPoll}...`);
requestRetry({
    url: urlToPoll,
    maxAttempts: Math.ceil(timeout / 2.),
    retryDelay: 2
  }, (err) => {
    if (err) {
      console.log(`ERROR: ${urlToPoll} failed to respond`, err);
      process.exit(1);
    } else {
      console.log(`${urlToPoll} successfully reached.`);
      process.exit(0);
    }
  });
