import { BookshelfModel, EntryBookshelfModel, CommentBookshelfModel } from "bookshelf";
import * as React from "preact";
import enums from "server/core/enums";
import forms from "server/core/forms";
import links from "server/core/links";
import security from "server/core/security";
import { dateTime, markdown, relativeTime } from "server/core/templating-filters";
import { User } from "server/entity/user.entity";
import { ifFalse, ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";
import * as formMacros from "server/macros/form.macros";

export interface CommentEditorOptions {
  readingUser?: User;
  allowAnonymous?: boolean;
}

export function post(postModel: BookshelfModel, options: {
  readingUser?: User;
  readingUserLikes?: Record<number, string>;
  hideHeading?: boolean;
  hideBody?: boolean;
  hideDetails?: boolean;
  showId?: boolean;
  allowMods?: boolean;
  commentsAnchorLinks?: boolean;
  smallTitle?: boolean;
} = {}) {
  const author = postModel.related<BookshelfModel>("author");

  return <div class="post">
    {ifFalse(options.hideHeading, () => {
      const H = options.smallTitle ? "h4" : "h1";
      return <H>
        <a name={"p" + postModel.get("id")} class="anchor" />
        <a href={links.routeUrl(postModel, "post")} class="post__title">
          {postModel.get("title")}
        </a>
        {ifTrue(security.canUserWrite(options.readingUser, postModel, options), () =>
          <a class="btn btn-outline-secondary btn-sm ml-2" href={links.routeUrl(postModel, "post", "edit")}>
            <span class="fas fa-pencil-alt"></span>
            <span class="d-none d-md-inline">Edit</span>
          </a>
        )}
        <a href={options.commentsAnchorLinks ? "#comments" : links.routeUrl(postModel, "post", "#comments")} class="post__comment-count ml-2">
          <span class="fas fa-comments"></span> {postModel.get("comment_count") || 0}
        </a>
        <span class="js-like ml-1">
          {postLikes(postModel, options)}
        </span>
        {ifTrue(options.showId, () =>
          <span style="font-family: monospace; font-size: 1rem">ID={postModel.get("id")}</span>
        )}
      </H>;
    })}

    {ifFalse(options.hideDetails, () => {
      const isPublished = forms.isPast(postModel.get("published_at"));
      const relatedEvent = postModel.related<BookshelfModel>("event");
      const relatedEntry = postModel.related<BookshelfModel>("entry") as EntryBookshelfModel;

      return <div class="card">
        <div class="post__details">
          <a href={links.routeUrl(author, "user")}>
            {ifSet(author.get("avatar"), () =>
              <img src={links.pictureUrl(author.get("avatar"), author)} class="post__avatar" />
            )}
            {ifNotSet(author.get("avatar"), () =>
              <img src={links.staticUrl("/static/images/default-avatar.png")} class="post__avatar" />
            )}
            {author.get("title")}
          </a>
          <span>
            &nbsp;•&nbsp;
            {ifTrue(isPublished, () =>
              <span data-toggle="tooltip" title={dateTime(postModel.get("published_at"), options.readingUser)}>
                {relativeTime(postModel.get("published_at"))}
              </span>
            )}
            {ifTrue(postModel.get("published_at") && !isPublished, () =>
              <jsx-wrapper>
                <span class="badge">Scheduled</span> for {dateTime(postModel.get("published_at"), options.readingUser)}
              </jsx-wrapper>
            )}
            {ifTrue(!postModel.get("published_at") && !isPublished, () =>
              <span class="badge">Draft</span>
            )}
          </span>

          {ifSet(relatedEvent.get("id"), () =>
            <jsx-wrapper>
              on <a href={links.routeUrl(relatedEvent, "event")}>{relatedEvent.get("title")}</a>
            </jsx-wrapper>
          )}
          {ifSet(relatedEntry.get("id"), () =>
            <span style="display: inline-block;">
              entry <a href={links.routeUrl(relatedEntry, "entry")}>
                {ifSet(relatedEntry.pictureIcon(), () =>
                  <img data-src={links.pictureUrl(relatedEntry.pictureIcon(), relatedEntry)}
                    class="no-border js-lazy" style="max-height: 32px; margin-top: -2px;" />
                )}
                {relatedEntry.get("title")}
              </a>
            </span>
          )}
        </div>

        {ifFalse(options.hideBody, () =>
          <div class="post__body card-body user-contents" dangerouslySetInnerHTML={markdown(postModel.get("body"))} />
        )}

        {ifTrue(!options.hideBody && !options.commentsAnchorLinks, () =>
          <div class="post__footer">
            <a href={links.routeUrl(postModel, "post", "#comments")}>
              <span class="fas fa-comments"></span>&nbsp;
              {postModel.get("comment_count") || 0} comment{postModel.get("comment_count") !== 1 ? "s" : ""}
            </a>
          </div>
        )}
      </div>;

    })}

  </div>;
}

export function postLikes(postModel: BookshelfModel, options: {
  readingUser?: User;
  readingUserLikes?: Record<number, string>;
}) {
  return <span data-toggle="tooltip" class="cursor-default"
    title={`${postModel.get("like_count") || 0} gem${postModel.get("like_count") !== -1 ? "s" : ""}`}>
    {ifSet(options.readingUser, () => {
      if (options.readingUser.get("id") === postModel.get("author_user_id")) {
        return <span class="post__like-count liked">
          <span class={enums.LIKES.like.icon_liked}></span> {postModel.get("like_count") || 0}
        </span>;
      } else if (options.readingUserLikes) {
        const liked = options.readingUserLikes ? options.readingUserLikes[postModel.get("id")] : false;
        const likeType = (liked && enums.LIKES[liked]) ? enums.LIKES[liked] : enums.LIKES.like;
        const likeIcon = liked ? likeType.icon_liked : likeType.icon_unliked;
        return <form method="post"
          action={`${links.routeUrl(postModel, "post", "like")}?redirect=${links.routeUrl(postModel, "post")}#p${postModel.get("id")}`}
          class={"post__like-count " + liked ? "liked" : ""}>
          <input type="hidden" name={liked ? "unlike" : "like"} value="like" />
          <button type="submit" class="js-like-button" data-post-id={postModel.get("id")} data-post-name={postModel.get("name")} data-liked={liked}>
            <span class={likeIcon}></span> {postModel.get("like_count") || 0}
          </button>
        </form>;
      }
    })}
    {ifNotSet(options.readingUser, () =>
      <a href={"/login?redirect=" + links.routeUrl(postModel, "post")} class="post__like-count">
        <span class={enums.LIKES.like.icon_unliked}></span> {postModel.get("like_count") || 0}
      </a>
    )}
    <i class="js-like-spinner fas fa-spinner fa-spin legend d-none" title="Saving…"></i>
  </span>;
}

export function comments(commentsParam: BookshelfModel[], options: {
  readingUser?: User;
  editComment?: BookshelfModel;
  csrfToken?: Function;
  editableAnonComments?: number[];
  linkToNode?: boolean;
  nodeAuthorIds?: number[];
  readOnly?: boolean;
  preview?: boolean;
  highlightNewerThan?: any;
} & CommentEditorOptions) {
  return <jsx-wrapper>
    {commentsParam.map((comment: CommentBookshelfModel) => {
      const showEditor = options.readingUser && options.editComment && options.editComment.id === comment.id;
      return <jsx-wrapper>
        {ifTrue(showEditor, () =>
          commentEditor(comment, options.csrfToken, options)
        )}
        {ifFalse(showEditor, () => {
          const author = comment.related<BookshelfModel>("user");
          const node = comment.related<BookshelfModel>("node");
          const isOwnAnonComment = options.editableAnonComments && options.editableAnonComments.includes(comment.get("id"));
          const lastLinkedNode = node;

          return <div class={"row comment mb-3 "
            + ((options.highlightNewerThan && options.highlightNewerThan < comment.get("created_at")) ? "unread" : "")}>
            {ifTrue(options.linkToNode && !lastLinkedNode || node !== lastLinkedNode, () =>
              <div class="col-12">
                <a href={commentUrl(node, comment)}><h4 class="post__title">{node.get("title")}</h4></a>
              </div>
            )}
            <div class="offset-1 col-11">
              <a class="anchor" name="c{comment.id if comment}"></a>
              <div class="comment__details d-flex">
                {ifTrue(isOwnAnonComment, () =>
                  <a href={links.routeUrl(options.readingUser, "user")}>
                    <div class="comment__avatar-container">
                      {ifTrue(options.readingUser.get("avatar"), () =>
                        <img src={links.pictureUrl(options.readingUser.get("avatar"), options.readingUser)} />
                      )}
                      {ifFalse(options.readingUser.get("avatar"), () =>
                        <img src={links.staticUrl("/static/images/default-avatar.png")} />
                      )}
                    </div>
                    {options.readingUser.get("title")} <span style="color: black">(as Anonymous)</span>
                  </a>
                )}
                {ifFalse(isOwnAnonComment, () => {
                  const AuthorLink = author.get("name") !== "anonymous" ? "a" : "span";
                  return <AuthorLink href={links.routeUrl(author, "user")}>
                    <div class="comment__avatar-container">
                      {ifTrue(author.get("avatar"), () =>
                        <img src={links.pictureUrl(author.get("avatar"), author)} />
                      )}
                      {ifTrue(author.get("avatar"), () =>
                        <img src={links.staticUrl("/static/images/default-avatar.png")} />
                      )}
                    </div>
                    {author.get("title")}
                  </AuthorLink>;
                })}
                {(author.get("title") && author.get("name").toLowerCase() !== author.get("title").toLowerCase())
                  ? "(@" + author.get("name") + ")" : ""}
                {ifTrue(options.nodeAuthorIds && options.nodeAuthorIds.includes(author.get("id")), () =>
                  <jsx-wrapper>
                    <span>&nbsp;</span><span class="fas fa-scroll mt-1" data-toggle="tooltip" title="Page owner"></span>
                  </jsx-wrapper>
                )}
                <span>&nbsp;•&nbsp;</span><span data-toggle="tooltip" title={dateTime(comment.get("created_at"), options.readingUser)}>
                  {relativeTime(comment.get("created_at"))}</span>
                {ifTrue(comment.wasEdited(), () =>
                  <jsx-wrapper>
                    <span>&nbsp;•&nbsp;</span><span data-toggle="tooltip"
                      title={dateTime(comment.get("updated_at"), options.readingUser)}>edited</span>
                  </jsx-wrapper>
                )}
                {ifTrue(comment && !options.linkToNode, () =>
                  <jsx-wrapper>
                    <span>&nbsp;•&nbsp;</span><a href="#c{comment.id}"><i class="fas fa-link" aria-hidden="true"></i></a>
                  </jsx-wrapper>
                )}
                {ifTrue(!options.readOnly && (security.canUserWrite(options.readingUser, comment) || isOwnAnonComment), () =>
                  <a class="btn btn-outline-primary btn-sm ml-auto"
                    href={links.routeUrl(comment, "comment", "edit")}><span class="fas fa-pencil-alt"></span></a>
                )}
              </div>
              <div class="card">
                <div class="card-body comment__body user-contents">
                  {ifTrue(options.preview, () =>
                    <div dangerouslySetInnerHTML={markdown(comment.get("body"), { maxLength: 150, readMoreLink: commentUrl(node, comment) })} />
                  )}
                  {ifFalse(options.preview, () =>
                    <div dangerouslySetInnerHTML={markdown(comment.get("body"))} />
                  )}
                </div>
              </div>
            </div>
          </div>;
        })}
      </jsx-wrapper>;
    })}

    {ifTrue(comments.length === 0, () =>
      <div class="card card-body mb-3">No comments yet.</div>
    )}

    {ifFalse(options.readOnly, () =>
      commentEditor(null, options.csrfToken, options)
    )}

    <style type="text/css" dangerouslySetInnerHTML={{
      __html: `
    .CodeMirror, .CodeMirror-scroll {
      min-height: 120px;
    }
  `}} />
  </jsx-wrapper>;
}

export function commentUrl(node: BookshelfModel, commentModel: BookshelfModel) {
  return links.routeUrl(node, commentModel.get("node_type")) + "#c" + commentModel.id;
}

export function commentEditor(commentModel: BookshelfModel, csrfTokenJSX: Function, options: CommentEditorOptions) {
  const user = (commentModel && commentModel.related("user")) ? commentModel.related("user") : options.readingUser;
  const showAnon = options.allowAnonymous && !commentModel;
  if (user) {
    return <form method="post" action={links.routeUrl(commentModel, "comment", "edit")} class="comment js-warn-on-unsaved-changes">
      {csrfTokenJSX()}
      <input type="hidden" name="action" value="comment" />
      <input type="hidden" name="id" value={commentModel?.id} />
      <a class="anchor" name={commentModel ? ("c" + commentModel.id) : ""}></a>
      <div class="row">
        <div class="offset-1 col-11">
          <div class="comment__details">
            <div class="comment__avatar-container">
              {ifSet(user.get("avatar"), () =>
                <img src={user.get("avatar")} />
              )}
              {ifNotSet(user.get("avatar"), () =>
                <img src={links.staticUrl("/static/images/default-avatar.png")} />
              )}
            </div>
            {user.get("title")}
          </div>
          <div class={"mb-3 " + (commentModel?.id ? "card card-body" : "")}>
            {formMacros.editor("body", commentModel?.get("body"))}

            <div class="comment__actions">
              <div class="float-right">
                <input type="submit" name="save" class="btn btn-primary" value="Save" />
                {ifSet(commentModel?.id, () =>
                  <a href={links.routeUrl(commentModel, "comment")} class="btn btn-outline-primary">Cancel</a>
                )}
              </div>
              {ifSet(commentModel?.id, () =>
                <input type="submit" name="delete" class="btn btn-danger" value="Delete" hidden={commentModel?.id === undefined}
                  onclick="return confirm('Delete this comment?')" />
              )}
              {ifTrue(showAnon && !user.get("disallow_anonymous"), () =>
                <jsx-wrapper>
                  {formMacros.check("comment-anonymously", "Comment anonymously", null, { noMargin: true })}
                  (<a href="/article/docs/faq#anon-comment" target="_blank">why?</a>)
                </jsx-wrapper>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>;
  } else {
    return <a class="btn btn-primary" href="/login?redirect={{ path }}">Login to comment</a>;
  }
}
