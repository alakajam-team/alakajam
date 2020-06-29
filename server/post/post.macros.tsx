import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import { User } from "server/entity/user.entity";
import { nunjuckMacro, nunjuckMacroAsString } from "server/macros/nunjucks-macros";

const POST_MACROS_PATH = "post/post.macros.html";

export interface CommentEditorOptions {
  readingUser?: User;
  allowAnonymous?: boolean;
}

export function post(post: BookshelfModel, options: {
  readingUser?: User;
  readingUserLikes?: Record<number, string>;
  hideHeading?: boolean;
  hideBody?: boolean;
  hideDetails?: boolean;
  showId?: boolean;
  allowMods?: boolean;
  commentsAnchorLinks?: any[];
  smallTitle?: boolean;
} = {}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(POST_MACROS_PATH, "post", [post, options])} />;
}

export function postLikes(post: BookshelfModel, options: {
  readingUser?: User;
  readingUserLikes?: Record<number, string>;
}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(POST_MACROS_PATH, "postLikes", [post, options])} />;
}

export function comments(comments: BookshelfModel[], options: {
  readingUser?: User;
  editComment?: BookshelfModel;
  csrfToken?: Function;
  editableAnonComments?: boolean;
  linkToNode?: boolean;
  nodeAuthorIds?: number[];
  readOnly?: boolean;
  preview?: boolean;
} & CommentEditorOptions) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(POST_MACROS_PATH, "comments", [comments, options])} />;
}

export function commentUrl(node: BookshelfModel, comment: BookshelfModel) {
  return nunjuckMacroAsString(POST_MACROS_PATH, "commentUrl", [node, comment]);
}

export function commentEditor(comment: BookshelfModel, csrfToken: Function, options: CommentEditorOptions) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(POST_MACROS_PATH, "commentEditor", [comment, csrfToken, options])} />;
}
