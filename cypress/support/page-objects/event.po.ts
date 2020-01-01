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
        return cy.get("#js-view-themes .btn-primary[type=submit]");
    }

    get themeIdeaFields() {
        return cy.get(".themes__idea input[type=text]");
    }

    get themeIdeaDeleteButtons() {
        return cy.get(".themes__idea .js-idea-delete");
    }

    get themeIdeasSaveButton() {
        return cy.get("#js-manage-themes .btn-primary");
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

    get themePastVotes() {
        return cy.get(".theme-past");
    }
    get themeShortlistThemes() {
        return cy.get(".theme-shortlist-line draggable");
    }

    get themeShortlistSubmitButton() {
        return cy.get("#js-shortlist-submit");
    }

    public enableThemeShortlistSubmitButton() {
        cy.window().then(window => {
            const submitButton = window.document.querySelector("#js-shortlist-submit");
            submitButton?.removeAttribute("disabled");
            submitButton?.setAttribute("class", "btn");
        });
    }

}

export default new EventPO();
