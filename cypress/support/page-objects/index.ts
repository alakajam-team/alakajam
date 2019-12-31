import adminDevPo from "./admin-dev.po";
import dashboardPo from "./dashboard";
import entryEditPo from "./entry-edit.po";
import entryPo from "./entry.po";
import eventEditPo from "./event-edit.po";
import eventPo from "./event.po";
import gamesPo from "./games.po";
import loginPo from "./login.po";
import peoplePo from "./people.po";
import postEditPo from "./post-edit.po";
import postPo from "./post.po";
import registerPo from "./register.po";
import userMenuPo from "./user-menu.po";
import entrySubmitScorePo from "./entry-highscore-submit.po";
import entryHighscoreSubmitPo from "./entry-highscore-submit.po";

class SitePO {

    get userMenu() {
        return userMenuPo;
    }

    get entry() {
        return entryPo;
    }
    
    get entryEdit() {
        return entryEditPo;
    }

    get entryHighscoreSubmit() {
        return entryHighscoreSubmitPo;
    }

    get event() {
        return eventPo;
    }

    get eventEdit() {
        return eventEditPo;
    }

    get post() {
        return postPo;
    }
    
    get postEdit() {
        return postEditPo;
    }

    get dashboard() {
        return dashboardPo;
    }

    get people() {
        return peoplePo;
    }

    get games() {
        return gamesPo;
    }

    /**
     * Tip: Use cy.loginAs() to log as an user
     */
    get login() {
        return loginPo;
    }

    get register() {
        return registerPo;
    }

    get adminDev() {
        return adminDevPo;
    }

    // Utilities

    getEditor({ index }: { index: number } = { index: 0 }) {
        return cy.get(".CodeMirror textarea").eq(index);
    }

}

export default new SitePO();
