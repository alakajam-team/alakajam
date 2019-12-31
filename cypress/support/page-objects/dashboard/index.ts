import dashboardPostsPo from "./dashboard-posts.po";
import dashboardFeedPo from "./dashboard-feed.po";
import dashboardPasswordPo from "./dashboard-password.po";
import dashboardEntriesPo from "./dashboard-entries.po";
import dashboardSettingsPo from "./dashboard-settings.po";

class DashboardPO {

    get feed() {
        return dashboardFeedPo;
    }

    get posts() {
        return dashboardPostsPo;
    }

    get entries() {
        return dashboardEntriesPo;
    }

    get settings() {
        return dashboardSettingsPo;
    }

    get changePassword() {
        return dashboardPasswordPo;
    }
    
}

export default new DashboardPO();
