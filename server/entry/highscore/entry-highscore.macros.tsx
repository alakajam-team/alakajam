import * as React from "preact";
import { nunjuckMacro } from "server/macros/nunjucks-macros";

const ENTRY_HIGHSCORE_MACROS_PATH = "entry/highscore/entry-highscore.macros.html";

export function highScoresLinks(entry, user, path, options = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(ENTRY_HIGHSCORE_MACROS_PATH, "highScoresLinks", [entry, user, path, options])} />;
}

export function tournamentEventBanner(tournamentEvent) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(ENTRY_HIGHSCORE_MACROS_PATH, "tournamentEventBanner", [tournamentEvent])} />;
}

export function highScores(entry, scoreCollection, userScore = null, options = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(ENTRY_HIGHSCORE_MACROS_PATH, "highScores", [entry, scoreCollection, userScore, options])} />;
}

export function streamerBadge(scoreUser, streamerBadges) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(ENTRY_HIGHSCORE_MACROS_PATH, "streamerBadge", [scoreUser, streamerBadges])} />;
}

export function printProof(score) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(ENTRY_HIGHSCORE_MACROS_PATH, "printProof", [score])} />;
}

export function printRanking(ranking, options = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(ENTRY_HIGHSCORE_MACROS_PATH, "printRanking", [ranking, options])} />;
}

export function printScore(entry, score, options = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(ENTRY_HIGHSCORE_MACROS_PATH, "printScore", [entry, score, options])} />;
}

export function pointsDistributionLegend(pointsDistribution) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(ENTRY_HIGHSCORE_MACROS_PATH, "pointsDistributionLegend", [pointsDistribution])} />;
}

export function highScoreThumb(entryScore) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(ENTRY_HIGHSCORE_MACROS_PATH, "highScoreThumb", [entryScore])} />;
}


