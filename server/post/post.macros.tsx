import { BookshelfModel } from "bookshelf";
import * as React from "preact";
import { User } from "server/entity/user.entity";
import { nunjuckMacro } from "server/macros/nunjucks-macros";

const POST_MACROS_PATH = "post/post.macros.html";

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
