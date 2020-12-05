import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import { ifTrue } from "server/macros/jsx-utils";
import * as jumbotronMacros from "server/macros/jumbotron.macros";
import * as navigationMacros from "server/macros/navigation.macros";
import * as postMacros from "server/post/post.macros";
import * as userMacros from "server/user/user.macros";

export default function render(context: CommonLocals): JSX.Element {
  const { posts, event, eventParticipation, user, userEntry, path,
    tournamentScore, inviteToJoin, userLikes } = context;

  userMacros.registerTwitchEmbedScripts(context);

  return base(context,
    <div>
      {jumbotronMacros.eventJumbotron(event, eventParticipation, null, user, userLikes, userEntry, tournamentScore, path,
        { inviteToJoin })}

      <div class="container thin mt-3">
        {posts.models.map(post =>
          <div>
            {postMacros.post(post, { readingUser: user, readingUserLikes: userLikes })}
            <div class="spacing"></div>
          </div>
        )}

        {ifTrue(posts.models.length > 0, () =>
          navigationMacros.pagination(1, posts.pagination.pageCount, "/posts?special_post_type=announcement&event_id=" + event.get("id"))
        )}
        {ifTrue(posts.models.length === 0, () =>
          <div class="card card-body">
            No announcements yet.
          </div>
        )}
      </div>
    </div>
  );
}
