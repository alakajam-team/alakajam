import { expect } from "chai";
import { rateLimit } from "./rate-limiter";

describe.only("Rate limiter", () => {

  it("should only accept the first call in the same frame", async () => {
    const counter = createCounter();

    for (let i = 0; i < 5; i++) {
      await rateLimit("test1", 0.1, counter.increment); // Only first one OK
    }

    expect(counter.count).to.eq(1);
  });

  it("should accept calls with sufficient delays", async () => {
    const counter = createCounter();

    for (let i = 0; i < 3; i++) {
      await rateLimit("test2", 0.01, counter.increment); // All OK
      await sleep(0.1);
    }

    expect(counter.count).to.eq(3);
  });

  it("should ignore calls with insufficient delays", async () => {
    const counter = createCounter();

    await rateLimit("test3", 0.05, counter.increment); // OK
    await sleep(0.02);
    await rateLimit("test3", 0.05, counter.increment); // Skipped
    await sleep(0.1);
    await rateLimit("test3", 0.05, counter.increment); // OK

    expect(counter.count).to.eq(2);
  });

  it("should track different keys separately", async () => {
    const counter1 = createCounter();
    const counter2 = createCounter();

    await rateLimit("counter1", 0.01, counter1.increment); // OK
    await rateLimit("counter2", 1.0, counter2.increment); // OK
    await sleep(0.2);
    await rateLimit("counter1", 0.01, counter1.increment); // OK
    await rateLimit("counter2", 1.0, counter2.increment); // Skipped

    expect(counter1.count).to.eq(2);
    expect(counter2.count).to.eq(1);
  });

});

function createCounter(): { increment: () => void; count: number } {
  const counter = {
    count: 0,
    increment: () => counter.count++
  };
  counter.increment = counter.increment.bind(counter);
  return counter;
}

function sleep(delayS: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayS * 1000);
  });
}
