import { expect, test as base } from "@playwright/test";
import DashboardPO from "./page-objects/dashboard.po";
import EntryEditPO from "./page-objects/entry-edit.po";
import EntryHighscoreSubmitPO from "./page-objects/entry-highscore-submit.po";
import EntryPO from "./page-objects/entry.po";
import EventEditPO from "./page-objects/event-edit.po";
import EventPO from "./page-objects/event.po";
import GamesPO from "./page-objects/games.po";
import HeaderPO from "./page-objects/header.po";
import LoginPO from "./page-objects/login.po";
import PeoplePO from "./page-objects/people.po";
import PostEditPO from "./page-objects/post-edit.po";
import PostPO from "./page-objects/post.po";
import RegisterPO from "./page-objects/register.po";
import UserProfilePO from "./page-objects/user-profile.po";

interface PageObjects {
  dashboardPo: DashboardPO;
  entryEditPo: EntryEditPO;
  entryHighscoreSubmitPo: EntryHighscoreSubmitPO;
  entryPo: EntryPO;
  eventEditPo: EventEditPO;
  eventPo: EventPO;
  gamesPo: GamesPO;
  headerPo: HeaderPO;
  loginPo: LoginPO;
  peoplePo: PeoplePO;
  postEditPo: PostEditPO;
  postPo: PostPO;
  registerPo: RegisterPO;
  userProfilePo: UserProfilePO;
}

/**
 * Extends the Playwright test with our page objects, along with some defaults:
 * confirmation dialogs get accepted, and uncaught page errors fail the test.
 */
export const test = base.extend<PageObjects>({
  page: async ({ page }, use) => {
    const pageErrors: Error[] = [];
    page.on("dialog", (dialog) => dialog.accept());
    page.on("pageerror", (error) => pageErrors.push(error));
    await use(page);
    expect(pageErrors, "uncaught errors in the page").toEqual([]);
  },

  dashboardPo: async ({ page }, use) => use(new DashboardPO(page)),
  entryEditPo: async ({ page }, use) => use(new EntryEditPO(page)),
  entryHighscoreSubmitPo: async ({ page }, use) => use(new EntryHighscoreSubmitPO(page)),
  entryPo: async ({ page }, use) => use(new EntryPO(page)),
  eventEditPo: async ({ page }, use) => use(new EventEditPO(page)),
  eventPo: async ({ page }, use) => use(new EventPO(page)),
  gamesPo: async ({ page }, use) => use(new GamesPO(page)),
  headerPo: async ({ page }, use) => use(new HeaderPO(page)),
  loginPo: async ({ page }, use) => use(new LoginPO(page)),
  peoplePo: async ({ page }, use) => use(new PeoplePO(page)),
  postEditPo: async ({ page }, use) => use(new PostEditPO(page)),
  postPo: async ({ page }, use) => use(new PostPO(page)),
  registerPo: async ({ page }, use) => use(new RegisterPO(page)),
  userProfilePo: async ({ page }, use) => use(new UserProfilePO(page))
});

export { expect };
