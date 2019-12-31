import dashboardPostsPo from "./dashboard-posts";
import dashboardFeedPo from "./dashboard-feed";
import dashboardPasswordPo from "./dashboard-password";
import dashboardEntriesPo from "./dashboard-entries";
import dashboardSettingsPo from "./dashboard-settings";

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
