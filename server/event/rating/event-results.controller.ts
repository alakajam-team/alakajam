import cache from "server/core/cache";
import constants from "server/core/constants";
import enums from "server/core/enums";
import forms from "server/core/forms";
import eventService from "server/event/event.service";
import eventRatingService from "server/event/rating/event-rating.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";

/**
 * Browse event results
 */
export async function viewEventResults(req, res) {
  res.locals.pageTitle += " | Results";

  // Permission checks & special post case
  const statusResults = res.locals.event.get("status_results");
  if (forms.isId(statusResults)) {
    res.locals.resultsPost = await postService.findPostById(statusResults);
    res.locals.userLikes = await likeService.findUserLikeInfo([res.locals.resultsPost], res.locals.user);
  } else if (statusResults !== enums.EVENT.STATUS_RESULTS.RESULTS) {
    res.errorPage(404);
    return;
  }

  // Parse query
  let sortedBy = 1;
  let division = eventService.getDefaultDivision(res.locals.event);
  if (Object.keys(res.locals.event.get("divisions")).includes(req.query.division)) {
    division = req.query.division;
  }
  let context;
  if (division === enums.DIVISION.UNRANKED) {
    const cacheKey = "results_" + res.locals.event.get("name") + "_" + division;
    context = await cache.getOrFetch(cache.general, cacheKey, async () => {
      const findGameOptions = {
        eventId: res.locals.event.get("id"),
        divisions: [enums.DIVISION.UNRANKED],
      };
      const games = await eventService.findGames(findGameOptions);
      return {
        rankings: games.models,
        sortedBy,
        division,
      };
    });
  } else {
    if (forms.isInt(req.query.sortBy) && req.query.sortBy > 0 && req.query.sortBy <= constants.MAX_CATEGORY_COUNT) {
      sortedBy = parseInt(req.query.sortBy, 10);
    }

    // Gather entries rankings
    const cacheKey = "results_" + res.locals.event.get("name") + "_" + division + "_" + sortedBy;
    context = await cache.getOrFetch(cache.general, cacheKey, async () => {
      const rankingsCollection = await eventRatingService.findEntryRankings(res.locals.event, division, sortedBy);
      return {
        rankings: rankingsCollection.models,
        sortedBy,
        division,
      };
    });
  }

  res.render("event/rating/event-results", context);
}
