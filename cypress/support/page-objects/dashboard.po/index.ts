import dashboardEntriesPo from "./dashboard-entries.po";
import dashboardFeedPo from "./dashboard-feed.po";
import dashboardPasswordPo from "./dashboard-password.po";
import dashboardPostsPo from "./dashboard-posts.po";
import dashboardSettingsPo from "./dashboard-settings.po";

class DashboardPO {

  public get sidebarAvatar() {
    return cy.get(".list-group-item .user-thumb__avatar");
  }

  public get feed() {
    return dashboardFeedPo;
  }

  public get posts() {
    return dashboardPostsPo;
  }

  public get entries() {
    return dashboardEntriesPo;
  }

  public get settings() {
    return dashboardSettingsPo;
  }

  public get changePassword() {
    return dashboardPasswordPo;
  }

}

export default new DashboardPO();
