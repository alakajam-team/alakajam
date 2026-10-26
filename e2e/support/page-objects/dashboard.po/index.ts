import { Page } from "@playwright/test";
import DashboardEntriesPO from "./dashboard-entries.po";
import DashboardFeedPO from "./dashboard-feed.po";
import DashboardPasswordPO from "./dashboard-password.po";
import DashboardPostsPO from "./dashboard-posts.po";
import DashboardSettingsPO from "./dashboard-settings.po";

export default class DashboardPO {

  public constructor(private readonly page: Page) {
  }

  public get sidebarAvatar() {
    return this.page.locator(".user-thumb__avatar");
  }

  public get feed() {
    return new DashboardFeedPO(this.page);
  }

  public get posts() {
    return new DashboardPostsPO(this.page);
  }

  public get entries() {
    return new DashboardEntriesPO(this.page);
  }

  public get settings() {
    return new DashboardSettingsPO(this.page);
  }

  public get changePassword() {
    return new DashboardPasswordPO(this.page);
  }

}

