import gamesPo, { GameSearchBlockPO } from "./games.po";

class EventEdit {

    visit({ eventName, page }: {
        eventName: string,
        page?: "edit" | "edit#state" | "edit-themes" | "edit-entries" | "edit-tournament-games"
    }) {
        cy.visit(`/${eventName}/${page || "edit"}`);
    }

    // General > Tabs

    get appearanceTab() {
        return cy.get("a[href=#appearance]");
    }

    get stateTab() {
        return cy.get("a[href=#state]");
    }

    get jamConfigTab() {
        return cy.get("a[href=#jamconfig]");
    }

    // General > Status tab

    themeVotingStatusRadio(status: "disabled" | "off" | "voting" | "shortlist" | "closed" | "results") {
        return cy.get(`input[#status-theme-${status}]`)
    }

    entrySubmissionStatusRadio(status: "off" | "open" | "open_unranked" | "closed") {
        return cy.get(`input[#status-entry-${status}]`)
    }

    entryResultsStatusRadio(status: "disabled" | "off" | "voting" | "voting_rescue" | "results") {
        return cy.get(`input[#status-entry-${status}]`)
    }

    tournamentStatusRadio(status: "disabled" | "off" | "submission" | "playing" | "closed" | "results") {
        return cy.get(`input[#status-entry-${status}]`)
    }

    // Common

    get saveButton() {
        return cy.get(".btn-primary");
    }

    get deleteEventButton() {
        return cy.get(".btn-danger");
    }

}

export default new EventEdit();
