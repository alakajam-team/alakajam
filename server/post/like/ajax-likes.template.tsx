import { BookshelfModel } from "bookshelf";
import { JSX } from "preact";
import { User } from "server/entity/user.entity";
import * as postMacros from "server/post/post.macros";

export default function ajaxLikes(context: { post: BookshelfModel; user: User; userLikes: any }): JSX.Element {
  return postMacros.postLikes(context.post, { readingUser: context.user, readingUserLikes: context.userLikes });
}
