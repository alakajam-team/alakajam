import apiList from "../fixtures/api-list.json";
import { expect, test } from "../support/test";

test.describe("API", () => {

  test("triggers no errors when accessing endpoints", async ({ request }) => {
    for (const url of Object.values(apiList)) {
      await expect(await request.get(url), url).toBeOK();
    }
  });

});
