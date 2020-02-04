import { GameSearchBlockPO } from "./games-search-block.po";
import gamesPo from "./games.po";

class EventPO {

  public visit({ eventName, page }: {
    eventName: string;
    page?: "announcements" | "posts" | "themes" | "games" | "tournament-games" | "tournament-leaderboard";
  }) {
    cy.visit(`/${eventName}/${page || ""}`);
  }

  public get tournamentRankings() {
    return cy.get("table.table tbody tr");
  }

  public get postsTitles() {
    return cy.get(".post__title");
  }

  public get games(): GameSearchBlockPO {
    return gamesPo;
  }

  public get themeIdeas() {
    return cy.get(".themes__idea-label");
  }

  public get themeIdeaManageButton() {
    return cy.get("#js-view-themes .btn-primary[type=submit]");
  }

  public get themeIdeaFields() {
    return cy.get(".themes__idea input[type=text]");
  }

  public get themeIdeaDeleteButtons() {
    return cy.get(".themes__idea .js-idea-delete");
  }

  public get themeIdeasSaveButton() {
    return cy.get("#js-manage-themes .btn-primary");
  }

  public get themeVoteLabel() {
    return cy.get("#js-theme-title");
  }

  public get themeUpvote() {
    return cy.get("#js-upvote");
  }

  public get themeDownvote() {
    return cy.get("#js-downvote");
  }

  public get themePastVotes() {
    return cy.get(".theme-past");
  }

  public get themeResults() {
    return cy.get(".themes__results");
  }

  public get themeShortlistWinner() {
    return cy.get(".winner .theme-shortlist-line__label");
  }

  public get themeShortlistThemes() {
    return cy.get(".theme-shortlist-line__label");
  }

  public get themeShortlistSubmitButton() {
    return cy.get("#js-shortlist-submit");
  }

  public enableThemeShortlistSubmitButton() {
    cy.window().then((window) => {
      const submitButton = window.document.querySelector("#js-shortlist-submit");
      if (submitButton) {
        submitButton.removeAttribute("disabled");
        submitButton.setAttribute("class", "btn");
      }
    });
  }

}

export default new EventPO();
