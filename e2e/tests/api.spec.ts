import { API_ENDPOINTS } from "../support/page-lists";
import { expect, test } from "../support/test";

test.describe("API", () => {

  test("triggers no errors when accessing endpoints", async ({ request }) => {
    for (const url of Object.values(API_ENDPOINTS)) {
      await expect(await request.get(url), url).toBeOK();
    }
  });

});
