import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import security from "server/core/security";
import { relativeTime } from "server/core/templating-filters";
import templatingFunctions from "server/core/templating-functions";
import * as formMacros from "server/macros/form.macros";
import { ifFalse, ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as postMacros from "server/post/post.macros";

export default function render(context: CommonLocals): JSX.Element {
  const { post, user, userLikes, sortedComments, csrfToken, editComment, nodeAuthorIds, path } = context;

  formMacros.registerEditorScripts(context);

  return base(context,
    <div class="container thin">
      {ifNotSet(post.get("published_at"), () =>
        <div class="alert alert-warning"><strong>Draft post</strong> Other users can't see it until it is published.</div>
      )}

      {ifTrue(post.get("published_at") && !templatingFunctions.isPast(post.get("published_at")), () =>
        <div class="alert alert-warning"><strong>Pending post</strong> Other users can't see it until{" "}
          {relativeTime(post.get("published_at"))}.</div>
      )}

      {postMacros.post(post, { commentsAnchorLinks: true, readingUser: user, readingUserLikes: userLikes })}

      <a class="anchor" id="comments"></a>
      <h2 class="spacing">
        Comments <span class="legend">({post.get("comment_count") || "0"})</span>
        {ifSet(user, () =>
          <form method="post" class="comment__subscribe" action={links.routeUrl(post, "post", "watch")}>
            {context.csrfToken()}
            {/* Being subscribed to a post = having a user right. Only allow removing the right */}
            {ifTrue(security.isUserWatching(user, post), () =>
              <div>
                {ifTrue(security.canUserWrite(user, post), () =>
                  <><span class="fas fa-check"></span>&nbsp;Subscribed</>
                )}
                {ifFalse(security.canUserWrite(user, post), () =>
                  <button type="submit" class="btn btn-outline-secondary btn-sm"><span class="fas fa-minus"></span> Unsubscribe</button>
                )}
              </div>
            )}
            {ifFalse(security.isUserWatching(user, post), () =>
              <button type="submit" class="btn btn-outline-secondary btn-sm"><span class="fas fa-plus"></span> Subscribe</button>
            )}
          </form>
        )}
      </h2>

      {postMacros.comments(sortedComments, path, { readingUser: user, csrfToken, editComment, nodeAuthorIds })}
    </div>
  );
}
