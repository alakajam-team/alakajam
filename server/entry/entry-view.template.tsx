import { BookshelfCollection, BookshelfModel } from "bookshelf";
import { capitalize, range } from "lodash";
import * as React from "preact";
import base from "server/base.template";
import { ordinal } from "server/core/formats";
import links from "server/core/links";
import security from "server/core/security";
import * as templatingFilters from "server/core/templating-filters";
import { digits } from "server/core/templating-filters";
import * as scoreMacros from "server/entry/highscore/entry-highscore.macros";
import * as eventMacros from "server/event/event.macros";
import * as formMacros from "server/macros/form.macros";
import { ifFalse, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as postMacros from "server/post/post.macros";
import * as userMacros from "server/user/user.macros";
import { EntryLocals } from "./entry.middleware";

export default function render(context: EntryLocals) {
  const { entry, external, user, infoMessage, entryVotes, canVote, vote, minEntryVotes, featuredEvent,
    event, eventVote, csrfToken, sortedComments, editComment, editableAnonComments, nodeAuthorIds, posts } = context;

  formMacros.registerEditorScripts(context);

  return base(context,
    <div>
      <div class="container">
        <div class="row">
          <div class="col-md-12">
            {ifSet(infoMessage, () =>
              <div class="alert alert-info">{infoMessage}</div>
            )}

            <h1>
              {entry.get("title")}
              {ifTrue(security.canUserWrite(user, entry), () =>
                <a class="btn btn-outline-primary ml-2" href={ links.routeUrl(entry, "entry", "edit") }>Edit</a>
              )}
              {ifTrue(external, () =>
                <h2 style="margin-top: -5px; margin-bottom: 20px">
                  <span class="badge badge-sm badge-primary">External entry</span>
                  {ifTrue(entry.get("external_event"), () =>
                    <span>Made for <i>{entry.get("external_event")}</i></span>
                  )}
                </h2>
              )}
            </h1>
          </div>
        </div>
        <div class="row">
          <div class="col-md-8">
            {picture(entry, event)}

            {ifTrue(entry.related("details").get("body"), () =>
              <div class="card card-body post user-contents mb-3"
                dangerouslySetInnerHTML={templatingFilters.markdown(entry.related("details").get("body"))} />
            )}

            {ifTrue(user && event && eventVote, () =>
              voting(event, entry, entryVotes, user, canVote, vote, minEntryVotes, csrfToken)
            )}

            {ifTrue(event && event.get("status_results") === "closed" && entry.get("division") !== "unranked", () =>
              <div class="entry-voting">
                <h2 class="entry-voting__header">Game ratings</h2>
                <div class="entry-voting__body">
                  The ratings phase is now closed. Final results will be announced shortly.
                </div>
              </div>
            )}

            {ifTrue(event && event.get("status_results") === "results" && entry.get("division") !== "unranked", () =>
              votingResults(entry, event)
            )}

            {ifTrue(entry.get("allow_anonymous") && user && !user.get("disallow_anonymous"), () =>
              <p class="float-right my-1">
                This entry welcomes anonymous comments
                (<a href="/article/docs/faq#anon-comment" target="_blank">help</a>)
              </p>
            )}

            <h2>Comments <i>({entry.get("comment_count") || "0"})</i></h2>
            {
              postMacros.comments(sortedComments, {
                readingUser: user,
                csrfToken,
                editComment,
                allowAnonymous: entry.get("allow_anonymous"),
                editableAnonComments,
                nodeAuthorIds
              })
            }
          </div>

          <div class="col-md-4 game-info">
            <h3>Info</h3>

            {ifTrue(entry.get("description"), () =>
              <div class="card card-body entry__description user-contents">
                {entry.get("description")}
              </div>
            )}

            {ifFalse(external, () =>
              <div>
                <div class="entry__info">
                  <span class="entry__info-label">Division</span>
                  <span class="entry__info-value">{capitalize(entry.get("division"))}</span>
                </div>
                <div class="entry__info">
                  <span class="entry__info-label">Karma</span>
                  <span class="entry__info-value">{digits(entry.get("karma"), 0)}</span>
                </div>
              </div>
            )}
            <div class="entry__info">
              <span class="entry__info-label">Platforms</span>
              <div class="entry__info-value">
                {(entry.get("platforms") || []).map(name =>
                  <div class="entry__platform">{eventMacros.entryPlatformIcon(name, { hideLabel: true })}</div>
                )}
              </div>
            </div>
            {ifTrue(entry.related<BookshelfCollection>("tags").length > 0, () =>
              <div class="entry__info">
                <span class="entry__info-label">Tags</span>
                <div class="entry__info-value" style="width: 215px">
                  {entry.related<BookshelfCollection>("tags").models.map(tag =>
                    <a href="/games?eventId=&amp;tags={ tag.get('id') }" class="btn btn-outline-secondary btn-sm ml-1 mb-1">{tag.get("value")}</a>
                  )}
                </div>
              </div>
            )}
            <div class="entry__info">
              <span class="entry__info-label">Published</span>
              <span class="entry__info-value">{templatingFilters.date(entry.get("published_at"))}</span>
            </div>

            <h3 style="margin-top: 20px">Links</h3>

            <div class="entry__links">
              {ifTrue(security.canUserWrite(user, entry), () =>
                <a class="btn btn-outline-primary" href={ links.routeUrl(entry, "entry", "edit") }>Edit entry</a>
              )}
              {(entry.get("links") || []).map(link =>
                <a class="btn btn-primary" href={ link.url } target="_blank">
                  <span class="fas fa-external-link"></span>
                  {link.label}
                </a>
              )}
              {ifTrue((entry.get("links") || []).length === 0 || !entry.get("links")[0].url, () =>
                <div class="card card-body">No links yet.</div>
              )}
            </div>

            <h3 class="mt-4">Author{entry.related<BookshelfCollection>("userRoles").models.length > 1 ? "s" : ""}</h3>

            <div class="card card-body pb-2">
              <div class="row">
                {entry.sortedUserRoles().map(userRole =>
                  userMacros.userThumb(userRole.related<BookshelfModel>("user"), { fullWidth: true })
                )}
                {ifTrue(security.canUserWrite(user, entry), () =>
                  entry.related<BookshelfCollection>("invites").models.map(invite =>
                    userMacros.userThumb(invite.related("invited"), { fullWidth: true, pending: true })
                  )
                )}
              </div>
            </div>

            {ifTrue(entry.get("status_high_score") !== "off", () =>
              <div>
                <h3 name="high-scores" class="mt-4">High scores {scoreMacros.highScoresLinks(entry, user, context.path)}</h3>
                {scoreMacros.tournamentEventBanner(context.tournamentEvent)}
                {scoreMacros.highScores(entry, context.highScoresCollection, context.userScore, featuredEvent)}
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

function picture(entry, event) {
  const hasPictures = entry.picturePreviews().length > 0;
  const mainPicture = hasPictures ? links.pictureUrl(entry.picturePreviews()[0], entry) : links.staticUrl("/static/images/default-entry.png");

  const details = entry.related("details");

  return <div class={`entry__picture${hasPictures ? "" : " empty"}`} style={`background-image: url('${mainPicture}')`}>
    {ifTrue(event && event.get("status_results") === "results" && entry.get("division") !== "unranked", () =>
      <div class="entry-medals">
        {ifSet(details, () =>
          range(1, 7).map(categoryIndex => {
            const ranking = details.get("ranking_" + categoryIndex);
            if (ranking && ranking <= 3) {
              return <a href="#results">
                <span class="entry-results__category-medal medal-category-{categoryIndex} medal-ranking-{ranking} in-picture"></span>
              </a>;
            }
          })
        )}
      </div>
    )}
  </div>;
}

function voting(event, entry, entryVotes, user, canVote, vote, minEntryVotes, csrfToken) {
  return <div>

    {ifTrue(canVote, () =>
      <div class="entry-voting">
        <h2 class="entry-voting__header">
          <div class="float-right">
            <a href={links.routeUrl(event, "event", "ratings") } class="btn btn-outline-light btn-sm">Manage my ratings</a>
          </div>
      Game ratings
        </h2>
        <div class="entry-voting__body">
          {ifTrue(entry.get("division") === "unranked", () =>
            <div>
              <p>This game is an <strong>Unranked</strong> entry.</p>
              <p>Voting is disabled, please provide feedback instead.</p>
              <p style="margin-bottom: 0">
                <i>Note: The Karma formula grants you as many points on this entry as on ranked ones.
                  <a href="/article/docs/faq#karma-intro">Learn more</a></i>
              </p>
            </div>
          )}
          {ifTrue(entry.get("division") !== "unranked", () =>
            votingForm(entry, entryVotes, event, csrfToken, vote)
          )}
        </div>
      </div>
    )}

    {ifTrue(!canVote && !security.canUserWrite(user, entry), () =>
      <div class="entry-voting">
        <h2 class="entry-voting__header">Game ratings</h2>
        <div class="entry-voting__body">
          {ratingCountPhrase(entry, entryVotes)}
          <p>Because you didn't enter the event, you cannot rate this game. You can still provide feedback using comments!</p>
        </div>
      </div>
    )}

    {ifTrue(!canVote && entryVotes !== null && entry.get("division") !== "unranked", () =>
      <div class="entry-voting">
        <h2 class="entry-voting__header">Game ratings</h2>
        <div class="entry-voting__body">
          <p>You have received <strong>{entryVotes}</strong> rating{entryVotes !== 1 ? "s" : ""} so far.</p>
          {ifTrue(entryVotes < minEntryVotes, () =>
            <p>You need at least <strong>{minEntryVotes}</strong> ratings for your game to receive rankings.</p>
          )}
        </div>
      </div>
    )}
  </div>;
}

function votingForm(entry, entryVotes, event, csrfToken, vote) {
  const optouts = entry.related("details").get("optouts") || [];

  return <form action="" method="post">
    {csrfToken()}

    <div class="float-right">
      <div class="show-if-saving"><i class="fas fa-spinner fa-spin" title="Saving…"></i></div>
      <div class="show-if-saving-success"><i class="fas fa-check-circle" title="Ratings saved successfully"></i></div>
      <div class="show-if-saving-error"><i class="fas fa-times-circle"></i> <span class="js-saving-error-text"></span></div>
    </div>

    {ratingCountPhrase(entry, entryVotes)}

    <input type="hidden" name="action" value="vote" />
    <div>
      {event.related("details").get("category_titles").map((categoryTitle, index) => {
        const categoryIndex = index + 1;
        const categoryRating = vote ? vote.get("vote_" + categoryIndex) : undefined;
        return <div class="entry-voting__category">
          <input type="hidden" id={"js-vote-" + categoryIndex } name={"vote-" + categoryIndex }
            value={ digits(categoryRating || 0, 3) } autocomplete="off" />
          <div class="entry-voting__category-title">{categoryTitle}</div>
          <div id={"js-vote-label-" + categoryIndex } class="entry-voting__category-rating confirmed">
              &nbsp;{categoryRating > 0 ? digits(categoryRating, 0) : ""}</div>
          <div class="entry-voting__category-stars">
            <span data-category={ categoryIndex } data-rating="0"
              class={"js-star far fa-lg fa-circle " + (!categoryRating ? "confirmed" : "")}></span>
            {ifTrue(optouts.includes(categoryTitle), () =>
              <span>Opted out (<a href="/article/docs/faq#optouts">what?</a>)</span>
            )}
            {ifTrue(!optouts.includes(categoryTitle), () =>
              range(1, 11).map(i =>
                <span data-category={ categoryIndex } data-rating={ i }
                  class={"js-star fa-lg " + (i <= categoryRating ? "fas fa-star confirmed" : "far fa-star")}></span>
              )
            )}
          </div>
        </div>;
      })}
    </div>
  </form>;
}

function votingResults(entry, event) {
  const hasRatings = false;
  const details = entry.related("details");
  const entriesInDivision = event.related("details").get("division_counts")[entry.get("division")];

  return <div class="entry-results">
    <h2 class="entry-results__header"><a name="results"></a>Voting results</h2>
    <div class="entry-results__body">
      <p>
        {event.related("details").get("category_titles").map((categoryTitle, index) => {
          const categoryIndex = index + 1;
          const ranking = details.get("ranking_" + categoryIndex);
          const rating = details.get("rating_" + categoryIndex);

          if (ranking) {
            const percentage = (ranking - 1.) / entriesInDivision * 100;

            return <div class="entry-results__category">
              <div class="entry-results__category-title">{categoryTitle}</div>
              <div class="entry-results__category-ranking">
                <a href={`${links.routeUrl(event, "event", "results") }?sortBy=${ categoryIndex }&amp;division=${ entry.get("division")}`}>
                  {ifTrue(ranking <= 3, () =>
                    <span class={`entry-results__category-medal medal-category-${categoryIndex} medal-ranking-${ranking} in-picture`}></span>
                  )}
                  {ordinal(ranking)}
                </a>
              </div>
              <div class="entry-results__category-rating d-none d-sm-inline-block">{percentage > 0 ? digits(percentage, 0) + "%" : "" }</div>
              <div class="entry-results__category-rating">{digits(rating, 3)}</div>
              <div class="entry-results__category-stars d-none d-sm-inline-block">
                {range(1, 11).map(i =>
                  <span class={"fa-lg " + ((i <= rating) ? "fas fa-star" : "far fa-star")}></span>
                )}
              </div>
            </div>;
          }
        })}
      </p>

      {ifTrue(hasRatings, () =>
        <div>
          This game entered in the <strong>{capitalize(entry.get("division"))}</strong> competition
          (<strong>{entriesInDivision}</strong> entries).
        </div>
      )}
      {ifFalse(hasRatings, () =>
        <div>This entry did not get enough ratings to be ranked.</div>
      )}
    </div>
  </div>;
}

function ratingCountPhrase(entry, entryVotes) {
  return <p>
    This <strong>{capitalize(entry.get("division"))}</strong> entry has received&nbsp;
    <strong>{entryVotes}</strong> rating{entryVotes !== 1 ? "s" : ""} so far.
  </p>;
}
