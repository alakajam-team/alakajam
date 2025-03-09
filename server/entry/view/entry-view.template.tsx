import React, { JSX } from "preact";
import base from "server/base.template";
import * as templatingFilters from "server/core/templating-filters";
import * as scoreMacros from "server/entry/highscore/highscore.macros";
import * as formMacros from "server/macros/form.macros";
import { ifSet, ifTrue } from "server/macros/jsx-utils";
import * as postMacros from "server/post/post.macros";
import { EntryLocals } from "../entry.middleware";
import { entryAuthors } from "./components/entry-authors.template";
import entryHeader from "./components/entry-header.template";
import entryLinks from "./components/entry-links.template";
import entryMetadata from "./components/entry-metadata.template";
import { entryPicture } from "./components/entry-picture.template";
import { entryRatingResults } from "./components/rating/entry-rating-results.template";
import { entryRating } from "./components/rating/entry-rating.template";

export default function render(context: EntryLocals): JSX.Element {
  const { entry, external, user, infoMessage, entryVotes, canVoteOnEntry, vote, minEntryVotes, featuredEvent, path,
    event, eventVote, csrfToken, sortedComments, editComment, editableAnonComments, nodeAuthorIds, posts } = context;

  formMacros.registerEditorScripts(context);

  return base(context,
    <div>
      <div class="container">

        {/* Header */}
        <div class="row">
          <div class="col-md-12">
            {ifSet(infoMessage, () =>
              <div class="alert alert-info">{infoMessage}</div>
            )}

            {entryHeader(entry, user, external)}
          </div>
        </div>

        {/* Left column */}
        <div class="row">
          <div class="col-md-8">
            {entryPicture(entry, event)}

            {ifTrue(entry.related("details").get("body"), () =>
              <div class="card card-body post user-contents mb-3"
                dangerouslySetInnerHTML={templatingFilters.markdown(entry.related("details").get("body"))} />
            )}

            {ifTrue(user && event && eventVote, () =>
              entryRating(event, entry, entryVotes, user, canVoteOnEntry, vote, minEntryVotes, csrfToken)
            )}
            {/* TODO Refactor into entryRating() */}
            {ifTrue(event && event.get("status_results") === "closed" && entry.get("division") !== "unranked", () =>
              <div class="entry-voting">
                <h2 class="entry-voting__header">Game ratings</h2>
                <div class="entry-voting__body">
                  The ratings phase is now closed. Final results will be announced shortly.
                </div>
              </div>
            )}
            {ifTrue(event && event.get("status_results") === "results" && entry.get("division") !== "unranked", () =>
              entryRatingResults(entry, event)
            )}

            {ifTrue(entry.get("allow_anonymous") && user && !user.get("disallow_anonymous"), () =>
              <p class="float-right my-1">
                This entry welcomes anonymous comments
                (<a href="/article/docs/faq#commenting-anonymously" target="_blank">help</a>)
              </p>
            )}
            <h2>Comments <i>({entry.get("comment_count") || "0"})</i></h2>
            {
              postMacros.comments(sortedComments, path, {
                readingUser: user,
                csrfToken,
                editComment,
                allowAnonymous: entry.get("allow_anonymous"),
                editableAnonComments,
                nodeAuthorIds
              })
            }
          </div>

          {/* Right column */}
          <div class="col-md-4 game-info">
            {entryLinks(entry, user)}

            {entryAuthors(entry, user)}

            <h3>Details</h3>
            {entryMetadata(entry, external, event)}

            {ifTrue(entry.get("status_high_score") !== "off", () =>
              <div>
                <h3 class="mt-4"><a id="high-scores" />High scores {scoreMacros.highScoresLinks(entry, user, context.path)}</h3>
                {scoreMacros.tournamentEventBanner(context.tournamentEvent)}
                {scoreMacros.highScores(entry, context.highScoresCollection, context.userScore, featuredEvent, { currentUser: user })}
              </div>
            )}

            {ifTrue(posts.models.length > 0, () =>
              <div>
                <h3 class="mt-4">Related posts</h3>
                <div class="list-group">
                  {posts.models.map(post =>
                    <div class="list-group-item" style="margin-bottom: -10px">
                      {postMacros.post(post, { hideDetails: true, readingUser: user, readingUserLikes: context.userLikes, smallTitle: true })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
