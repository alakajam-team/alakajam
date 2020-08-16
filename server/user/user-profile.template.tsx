import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import { date, markdown, relativeTime } from "server/core/templating-filters";
import * as scoreMacros from "server/entry/highscore/entry-highscore.macros";
import * as eventMacros from "server/event/event.macros";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";
import * as navigationMacros from "server/macros/navigation.macros";
import * as postMacros from "server/post/post.macros";
import * as userMacros from "server/user/user.macros";

export default function render(context: CommonLocals) {
  const { profileUser, user, isTwitchLive, alakajamEntries, externalEntries, otherEntries, posts, userScores, userLikes, medals } = context;
  const socialLinks = profileUser.related("details").get("social_links") || {};
  const totalMedals = (medals[1] || 0) + (medals[2] || 0) + (medals[3] || 0);
  const hasAvatar = Boolean(profileUser.get("avatar"));

  userMacros.registerTwitchEmbedScripts(context);

  return base(context, <div class="container profile">
    <div class="row">
      <div class="col-md-4 col-lg-3">
        {ifTrue(hasAvatar, () =>
          <img src={links.pictureUrl(profileUser.get("avatar"), profileUser)} class="profile__avatar" />
        )}
        {ifFalse(hasAvatar, () =>
          <img src={links.staticUrl("/static/images/default-avatar.png")} class="profile__avatar" />
        )}

        <h1 class="profile__title">
          {profileUser.get("title")}
        </h1>
        <h3 class="profile__name">
          {profileUser.get("name")}
          <span class="profile__id">
            #{profileUser.get("id")}
          </span>
        </h3>
        <p class="profile__joined">
          Joined {relativeTime(profileUser.get("created_at"))}
        </p>

        {ifTrue(profileUser.get("is_admin"), () =>
          <p class="profile__admin">
            <img src={links.staticUrl("/static/images/adminbadge.png")} class="profile__admin" />
          </p>
        )}
        {ifTrue(profileUser.get("is_mod") && !profileUser.get("is_admin"), () =>
          <p class="profile__mod">
            <img src={links.staticUrl("/static/images/modbadge.png")} class="profile__mod" />
          </p>
        )}

        {ifTrue(user && user.get("id") === profileUser.get("id"), () =>
          <a href={links.routeUrl(user, "user", "feed")} class="btn btn-outline-primary">View dashboard</a>
        )}

        <div class="spacing">
          {ifTrue(socialLinks.website, () =>
            <div class="profile__social-link">
              <a href={socialLinks.website}>
                <span class="fas fa-home" style="color: black; font-size: 24px"></span> Website
              </a>
            </div>
          )}
          {ifTrue(socialLinks.twitch, () =>
            <div class="profile__social-link">
              {userMacros.twitchLink(profileUser)}
            </div>
          )}
          {ifTrue(socialLinks.twitter, () =>
            <div class="profile__social-link">
              <a href={`https://www.twitter.com/${socialLinks.twitter}`}>
                <img src={links.staticUrl("/static/images/social/twitter.svg")} class="no-border" style="width: 32px" /> Twitter
              </a>
            </div>
          )}
        </div>
      </div>

      <div class="col-md-8 col-lg-9">
        {ifTrue(isTwitchLive, () =>
          <div class="mb-3">
            {userMacros.twitchEmbed(profileUser.details.social_links.twitch, { height: 500 })}
          </div>
        )}

        {ifTrue(profileUser.related("details").get("body"), () =>
          <div>
            <h2>Bio</h2>
            <div class="featured" dangerouslySetInnerHTML={markdown(profileUser.related("details").get("body"))} />
            <div class="spacing"></div>
          </div>
        )}

        <ul class="nav nav-tabs nav-justified" style="margin-top: 30px; margin-bottom: 10px" role="tablist">
          <li class="nav-item">
            <a class="nav-link active" href="#entries" data-toggle="tab">Alakajam! games ({alakajamEntries.length + otherEntries.length})</a>
          </li>
          {ifTrue(externalEntries.length > 0, () =>
            <li class="nav-item"><a class="nav-link" href="#entries-ext" data-toggle="tab">Other games ({externalEntries.length})</a></li>
          )}
          <li class="nav-item"><a class="nav-link" href="#posts" data-toggle="tab">Blog posts ({posts.pagination.rowCount})</a></li>
          <li class="nav-item"><a class="nav-link" href="#scores" data-toggle="tab">High scores ({userScores.length})</a></li>
        </ul>
        <div class="tab-content">
          <div id="entries" class="tab-pane fade show active" role="tabpanel">
            {ifTrue(alakajamEntries.length > 0, () =>
              <div>
                <h2>Main events</h2>
                <div class="game-grid">
                  {alakajamEntries.map(entry =>
                    <div class="game-grid-entry">
                      {eventMacros.entryThumb(entry, { showEvent: true })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {ifTrue(otherEntries.length > 0, () =>
              <div>
                <h2>Special events</h2>
                <div class="game-grid">
                  {otherEntries.map(entry =>
                    <div class="game-grid-entry">
                      {eventMacros.entryThumb(entry, { showEvent: true })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {ifTrue(alakajamEntries.length === 0 && otherEntries.length === 0, () =>
              <div class="card card-body">{profileUser.get("title")} didn't submit games... Yet!</div>
            )}
          </div>
          <div id="entries-ext" class="tab-pane fade" role="tabpanel">
            <div class="game-grid">
              {externalEntries.map(entry =>
                <div class="game-grid-entry">
                  {eventMacros.entryThumb(entry, { showEvent: true })}
                </div>
              )}
            </div>
          </div>
          <div id="posts" class="tab-pane fade" role="tabpanel">
            {ifTrue(posts.models.length > 0, () =>
              <div>
                {posts.models.map(post =>
                  <div>
                    {postMacros.post(post, { readingUser: user, readingUserLikes: userLikes })}
                    <div class="spacing"></div>
                  </div>
                )}
                {navigationMacros.pagination(1, posts.pagination.pageCount, "/posts?special_post_type=all&user_id=" + profileUser.get("id"))}
              </div>
            )}

            {ifTrue(posts.models.length === 0, () =>
              <div class="card card-body">{profileUser.get("title")} didn't write posts... Yet!</div>
            )}
          </div>
          <div id="scores" class="tab-pane fade" role="tabpanel">
            <h1>High scores</h1>
            <div style="line-height: 40px">
              <div class="row">
                <div class="col-sm-4">

                  {ifTrue(totalMedals > 0, () =>
                    <div>
                      {scoreMacros.printRanking(1)} x{medals[1] || 0}
                      {scoreMacros.printRanking(2)} x{medals[2] || 0}
                      {scoreMacros.printRanking(3)} x{medals[3] || 0}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {ifTrue(userScores.length > 0, () =>
              <table class="table sortable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Game</th>
                    <th>Score</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {userScores.map(userScore => {
                    const entry = userScore.related("entry");
                    return <tr>
                      <td>{scoreMacros.printRanking(userScore.get("ranking"))}</td>
                      <td style="max-width: 200px">{eventMacros.entrySmallThumb(entry)}</td>
                      <td>
                        <b>{scoreMacros.printScore(entry, userScore, { showEditLink: false })}</b>
                      </td>
                      <td style="font-size: 0.8rem">{date(userScore.get("updated_at"))}</td>
                      <td>
                        <b>{scoreMacros.printProof(userScore)}</b>
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            )}
            {ifTrue(userScores.length === 0, () =>
              <div>
                <p>No score submitted yet!</p>
                <p><a class="btn btn-primary" href="/games?highScoresSupport=on">Find games with high scores</a></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
