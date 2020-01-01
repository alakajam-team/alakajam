import { GameSearchBlockPO } from "./games-search-block.po";
import gamesPo from "./games.po";

class EventPO {

    public visit({ eventName, page }: {
        eventName: string,
        page?: "announcements" | "posts" | "themes" | "games" | "tournament-games" | "tournament-leaderboard"
    }) {
        cy.visit(`/${eventName}/${page || ""}`);
    }

    get tournamentRankings() {
        return cy.get("table.table tbody tr");
    }

    get postsTitles() {
        return cy.get(".post__title");
    }

    get games(): GameSearchBlockPO {
        return gamesPo;
    }

    get themeIdeas() {
        return cy.get(".themes__idea-label");
    }

    get themeIdeaManageButton() {
        return cy.get(".themes__idea .btn-primary");
    }

    get themeVoteLabel() {
        return cy.get("#js-theme-title");
    }

    get themeUpvote() {
        return cy.get("#js-upvote");
    }

    get themeDownvote() {
        return cy.get("#js-downvote");
    }

    get themeShortlistThemes() {
        return cy.get(".theme-shortlist-line draggable");
    }

    get themeShortlistSubmitButton() {
        return cy.get("#js-shortlist-submit");
    }

    public enableThemeShortlistSubmitButton() {
        cy.exec(`
            $("#js-shortlist-submit")
                .removeAttr("disabled")
                .removeClass("disabled");
        `);
    }

}

export default new EventPO();
