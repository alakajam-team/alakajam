import * as React from "preact";
import { nunjuckMacro, nunjuckMacroAsString } from "./nunjucks-macros";

const JUMBOTRON_MACROS_PATH = "macros/jumbotron.macros.html";

export function eventJumbotron(event, eventParticipation, featuredPost, user, entry, tournamentScore, options = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(JUMBOTRON_MACROS_PATH, "eventJumbotron",
    [event, eventParticipation, featuredPost, user, entry, tournamentScore, options])} />;
}

export function myEntryJumbotronContent(event, entry, eventParticipation, options = {}, isTournament) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(JUMBOTRON_MACROS_PATH, "myEntryJumbotronContent",
    [event, entry, eventParticipation, options, isTournament])} />;
}

export function tournamentJumbotronContent(user, event, eventParticipation, tournamentScore, entry, options = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(JUMBOTRON_MACROS_PATH, "tournamentJumbotronContent",
    [user, event, eventParticipation, tournamentScore, entry, options])} />;
}

export function statsCounters(event) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(JUMBOTRON_MACROS_PATH, "statsCounters", [event])} />;
}

export function eventJumbotronCountdownPhrase(event, user) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(JUMBOTRON_MACROS_PATH, "eventJumbotronCountdownPhrase", [event, user])} />;
}

export function backgroundImage(event) {
  return nunjuckMacroAsString(JUMBOTRON_MACROS_PATH, "backgroundImage", [event]);
}
