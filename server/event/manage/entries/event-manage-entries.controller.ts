
import { BookshelfCollection, BookshelfCollectionOf, EntryBookshelfModel } from "bookshelf";
import forms from "server/core/forms";
import security from "server/core/security";
import entryHotnessService from "server/entry/entry-hotness.service";
import entryService, { FindGamesOptions } from "server/entry/entry.service";
import karmaService from "server/event/ratings/karma.service";
import ratingService from "server/event/ratings/rating.service";
import commentService from "server/post/comment/comment.service";
import { CustomRequest, CustomResponse } from "server/types";
import userService from "server/user/user.service";
import { EventLocals } from "../../event.middleware";

/**
 * Browse event entries
 */
export async function eventManageEntries(req: CustomRequest, res: CustomResponse<EventLocals>): Promise<void> {
  res.locals.pageTitle += " | Entries";

  if (!security.isMod(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  const event = res.locals.event;

  if (req.query.hotness) {
    await entryHotnessService.refreshEntriesHotness(event);
  }

  // Find all entries
  const findGameOptions: Partial<FindGamesOptions> = {
    eventId: event.get("id"),
    pageSize: null,
    withRelated: ["userRoles", "details"],
  };
  if (req.query.orderBy === "ratingCount") {
    findGameOptions.sortBy = "rating-count";
  }
  const entriesCollection = await entryService.findEntries(findGameOptions) as BookshelfCollection;

  // Gather info for karma details
  const entriesById = {};
  entriesCollection.forEach((entry) => {
    entriesById[entry.get("id")] = entry;
  });
  const detailedEntryInfo: any = {};
  const usersById = {};
  if (forms.isId(req.query.entryDetails) && entriesById[forms.parseInt(req.query.entryDetails.toString())]) {
    const eventUsersCollection = await userService.findUsers({ eventId: event.get("id") });
    eventUsersCollection.forEach((user) => {
      usersById[user.get("id")] = user;
    });

    const entry = entriesById[forms.parseInt(req.query.entryDetails.toString())];
    await entry.load(["comments", "votes"]);
    detailedEntryInfo.id = req.query.entryDetails;
    detailedEntryInfo.given = await ratingService.computeKarmaGivenByUserAndEntry(entry, event);
    detailedEntryInfo.received = await ratingService.computeKarmaReceivedByUser(entry);
    detailedEntryInfo.total = ratingService.computeKarma(detailedEntryInfo.received.total,
      detailedEntryInfo.given.total);
  }

  res.render<EventLocals>("event/manage/entries/event-manage-entries", {
    ...res.locals,
    entries: entriesCollection.models,
    entriesById,
    usersById,
    detailedEntryInfo,
  });
}

export async function eventManageEntriesPost(req: CustomRequest, res: CustomResponse<EventLocals>): Promise<void> {
  if (!security.isAdmin(res.locals.user)) {
    res.errorPage(403);
    return;
  }

  const event = res.locals.event;

  if (req.body.refreshKarma !== undefined) {
    const entries = await entryService.findEntries({
      eventId: event.get("id"),
      withRelated: ["comments"]
    }) as BookshelfCollectionOf<EntryBookshelfModel>;

    for (const entry of entries.models) {
      const comments = await commentService.findCommentsOnNodeForDisplay(entry);
      for (const comment of comments) {
        await karmaService.refreshCommentKarma(comment);
        await comment.save();
      }
    }
    for (const entry of entries.models) {
      await ratingService.refreshEntryKarma(entry, event);
    }
    res.locals.alerts.push({ type: "success", message: "Karma recalculated on all entries." });
  }

  res.redirect(req.url);
}
