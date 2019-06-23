import enums from "server/core/enums";
import eventRatingService from "server/event/rating/event-rating.service";

/**
 * Browse ratings by own user
 */
export async function viewEventRatings(req, res) {
  res.locals.pageTitle += " | Ratings";

  const { user, event } = res.locals;

  if (user && [enums.EVENT.STATUS_RESULTS.VOTING, enums.EVENT.STATUS_RESULTS.VOTING_RESCUE,
    enums.EVENT.STATUS_RESULTS.RESULTS].includes(event.get("status_results"))) {
    const voteHistoryCollection = await eventRatingService.findVoteHistory(res.locals.user.get("id"), event,
      { withRelated: ["entry.details", "entry.userRoles"] });
    const categoryTitles: string[] = event.related("details").get("category_titles");
    const divisions = Object.keys(event.get("divisions"));

    const votesPerCategory = [];
    categoryTitles.forEach((_, i) => {
      const categoryIndex = i + 1;
      const voteFilter = (division) => {
        return (vote, vote2) => {
          return vote.get("vote_" + categoryIndex) > 0 && vote.related("entry").get("division") === division;
        };
      };
      const voteSorter = (vote, vote2) => {
        return vote2.get("vote_" + categoryIndex) - vote.get("vote_" + categoryIndex);
      };

      const votesPerDivision = {};
      for (const division of divisions) {
        if (division !== enums.DIVISION.UNRANKED) {
          votesPerDivision[division] = voteHistoryCollection.filter(voteFilter(division));
          votesPerDivision[division].sort(voteSorter);
        }
      }

      votesPerCategory.push({
        title: categoryTitles[i],
        votesPerDivision,
      });
    });

    res.render("event/rating/event-ratings", {
      votesPerCategory,
      ratingCount: voteHistoryCollection.length,
    });
  } else {
    res.errorPage(404);
  }
}
