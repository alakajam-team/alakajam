import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { shuffle } from "lodash";
import cache from "server/core/cache";
import constants from "server/core/constants";
import enums from "server/core/enums";
import forms from "server/core/forms";
import { EventFlags } from "server/entity/event-details.entity";
import entryService from "server/entry/entry.service";
import eventService from "server/event/event.service";
import ratingService from "server/event/ratings/rating.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import { EventLocals } from "../event.middleware";

/**
 * Browse event results
 */
export async function viewEventResults(req: CustomRequest, res: CustomResponse<EventLocals>): Promise<void> {
  res.locals.pageTitle += " | Results";

  const { event } = res.locals;

  // Permission checks & special post case
  const statusResults = event.get("status_results");
  if (forms.isId(statusResults)) {
    res.locals.resultsPost = await postService.findPostById(statusResults);
    res.locals.userLikes = await likeService.findUserLikeInfo([res.locals.resultsPost], res.locals.user);
  } else if (statusResults !== enums.EVENT.STATUS_RESULTS.RESULTS) {
    res.errorPage(404);
    return;
  }

  // Parse query
  const flags = event.related<BookshelfModel>("details").get("flags") as EventFlags;
  let sortedBy = 1;
  let division = flags.specialAwards ? undefined : eventService.getDefaultDivision(event);
  if (forms.isInt(req.query.sortBy?.toString())) {
    const parsedSortedBy = forms.parseInt(req.query.sortBy.toString());
    if (parsedSortedBy > 0 && parsedSortedBy <= constants.MAX_CATEGORY_COUNT) {
      sortedBy = parsedSortedBy;
    }
  }
  if (Object.keys(event.get("divisions")).includes(req.query.division?.toString())) {
    division = req.query.division.toString();
    if (flags.specialAwards && sortedBy === 7) {
      sortedBy = 1; // Unset special ScoreSpace category when clicking a division
    }
  }
  if (!(flags.specialAwards && sortedBy === 7) && !division) {
    division = eventService.getDefaultDivision(event);
  }

  let context;
  if (division !== enums.DIVISION.UNRANKED) {
    // Ranked podium
    const cacheKey = "results_" + res.locals.event.get("name") + "_" + division + "_" + sortedBy;
    context = await cache.getOrFetch(cache.general, cacheKey, async () => {
      const rankingsCollection = await ratingService.findEntryRankings(res.locals.event, sortedBy, division);
      return {
        rankings: rankingsCollection.models,
        sortedBy,
        division,
      };
    });
  } else {
    // Unranked "podium"
    const cacheKey = "results_" + event.get("name") + "_" + division;
    context = await cache.getOrFetch(cache.general, cacheKey, async () => {
      const findGameOptions = {
        eventId: event.get("id"),
        divisions: [enums.DIVISION.UNRANKED],
      };
      const games = await entryService.findEntries(findGameOptions) as BookshelfCollection;
      return {
        rankings: shuffle(games.models),
        sortedBy,
        division,
      };
    });
  }

  res.render<EventLocals>("event/results/results", {
    ...res.locals,
    ...context,
    categoryTitles: eventService.getCategoryTitles(event)
  });
}
