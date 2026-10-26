import { Page } from "@playwright/test";
import GameSearchBlockPO from "./games-search-block.po";

export default class EventPO {

  public constructor(private readonly page: Page) {
  }

  public async visit({ eventName, page }: {
    eventName: string;
    page?: "announcements" | "posts" | "themes" | "games" | "results" | "dashboard" | "tournament-games" | "tournament-leaderboard";
  }) {
    await this.page.goto(`/${eventName}/${page || ""}`);
  }

  public get tournamentRankings() {
    return this.page.locator("table.table tbody tr");
  }

  public get postsTitles() {
    return this.page.locator(".post__title");
  }

  public post(title: string) {
    return this.page.locator(".post", {
      has: this.page.locator(".post__title", { hasText: title })
    });
  }

  public postBody(title: string) {
    return this.post(title).locator(".post__body");
  }

  /**
   * Author, event and related entry of the post
   */
  public postDetails(title: string) {
    return this.post(title).locator(".post__details");
  }

  // Event dashboard

  public get joinEventButton() {
    return this.page.locator("a.btn", { hasText: "Join event" });
  }

  public get rulesLink() {
    return this.page.locator("a.shortcut", { hasText: "Detailed rules" });
  }

  public get games() {
    return new GameSearchBlockPO(this.page);
  }

  public get themeIdeas() {
    return this.page.locator(".themes__idea-label");
  }

  public get themeIdeaManageButton() {
    return this.page.locator("#js-view-themes button.btn-primary");
  }

  public get themeIdeaFields() {
    return this.page.locator(".themes__idea input[type=text]");
  }

  public get themeIdeaDeleteButtons() {
    return this.page.locator(".themes__idea .js-idea-delete");
  }

  public get themeIdeasSaveButton() {
    return this.page.locator("#js-manage-themes .btn-primary");
  }

  public get themeVoteLabel() {
    return this.page.locator("#js-theme-title");
  }

  public get themeUpvote() {
    return this.page.locator("#js-upvote");
  }

  public get themeDownvote() {
    return this.page.locator("#js-downvote");
  }

  public get themePastVotes() {
    return this.page.locator(".theme-past");
  }

  public get themeResults() {
    return this.page.locator(".themes__results");
  }

  public get themeShortlistWinner() {
    return this.page.locator(".winner .theme-shortlist-line__label");
  }

  public get themeShortlistThemes() {
    return this.page.locator(".theme-shortlist-line__label");
  }

  public get themeShortlistSubmitButton() {
    return this.page.locator("#js-shortlist-submit");
  }

  public async enableThemeShortlistSubmitButton() {
    await this.themeShortlistSubmitButton.evaluate((submitButton) => {
      submitButton.removeAttribute("disabled");
      submitButton.setAttribute("class", "btn");
    });
  }

}

