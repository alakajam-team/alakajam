import adminDevPo from "./admin-dev.po";
import * as dashboardPo from "./dashboard";
import gamesPo from "./games.po";
import loginPo from "./login.po";
import peoplePo from "./people.po";
import postEditPo from "./post-edit.po";
import postPo from "./post.po";
import userMenuPo from "./user-menu.po";

class SitePO {

    get post() {
        return postPo;
    }
    get postEdit() {
        return postEditPo;
    }
    get people() {
        return peoplePo;
    }
    get dashboard() {
        return dashboardPo;
    }
    get userMenu() {
        return userMenuPo;
    }
    get login() {
        return loginPo;
    }
    get adminDev() {
        return adminDevPo;
    }
    get games() {
        return gamesPo;
    }

    // Utilities

    getEditor({ index }: { index: number } = { index: 0 }) {
        return cy.get(".CodeMirror textarea").eq(index);
    }

}

export default new SitePO();
