import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import { User } from "server/entity/user.entity";
import { nunjuckMacro, nunjuckMacroAsString } from "server/macros/nunjucks-macros";

const POST_MACROS_PATH = "post/post.macros.html";

export interface CommentEditorOptions {
  readingUser?: User;
  allowAnonymous?: boolean;
}

export function post(postParam: BookshelfModel, options: {
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
  return <div dangerouslySetInnerHTML={nunjuckMacro(POST_MACROS_PATH, "post", [postParam, options])} />;
}

export function postLikes(postParam: BookshelfModel, options: {
  readingUser?: User;
  readingUserLikes?: Record<number, string>;
}) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(POST_MACROS_PATH, "postLikes", [postParam, options])} />;
}

export function comments(commentsParam: BookshelfModel[], options: {
  readingUser?: User;
  editComment?: BookshelfModel;
  csrfToken?: Function;
  editableAnonComments?: boolean;
  linkToNode?: boolean;
  nodeAuthorIds?: number[];
  readOnly?: boolean;
  preview?: boolean;
  highlightNewerThan?: any;
} & CommentEditorOptions) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(POST_MACROS_PATH, "comments", [commentsParam, options])} />;
}

export function commentUrl(node: BookshelfModel, comment: BookshelfModel) {
  return nunjuckMacroAsString(POST_MACROS_PATH, "commentUrl", [node, comment]);
}

export function commentEditor(comment: BookshelfModel, csrfToken: Function, options: CommentEditorOptions) {
  return <div dangerouslySetInnerHTML={nunjuckMacro(POST_MACROS_PATH, "commentEditor", [comment, csrfToken, options])} />;
}
