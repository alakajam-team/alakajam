import { BookshelfModel } from "bookshelf";
import enums from "server/core/enums";
import entryService from "server/entry/entry.service";
import tournamentService from "server/event/tournament/tournament.service";
import likeService from "server/post/like/like.service";
import postService from "server/post/post.service";
import { CustomRequest, CustomResponse } from "server/types";
import eventParticipationService from "../dashboard/event-participation.service";
import { EventLocals } from "../event.middleware";

/**
 * Browse event home page
 */
export async function viewEventHome(req: CustomRequest, res: CustomResponse<EventLocals>) {
  const { user, event } = res.locals;

  const posts = await postService.findPosts({
    eventId: event.get("id"),
    specialPostType: "announcement",
  });
  const userEntry = user ? await entryService.findUserEntryForEvent(user, event.get("id")) : undefined;

  // Fetch tournament score
  let tournamentScore: BookshelfModel | undefined;
  if (user && event && event.get("status_tournament") !== "disabled") {
    tournamentScore = await tournamentService.findOrCreateTournamentScore(event.get("id"), user.get("id"));
  }

  // Check event participation status
  const eventParticipation = user ? await eventParticipationService.getEventParticipation(event.get("id"), user.get("id")) : undefined;
  const hasJoinedEvent = Boolean(eventParticipation);
  const inviteToJoin = (event.get("status_entry") !== enums.EVENT.STATUS_ENTRY.CLOSED) ? !hasJoinedEvent : false;

  res.render<EventLocals>("event/event-home", {
    ...res.locals,
    posts,
    tournamentScore,
    userEntry,
    userLikes: await likeService.findUserLikeInfo(posts.models, res.locals.user),
    inviteToJoin,
    eventParticipation,
  });
}
