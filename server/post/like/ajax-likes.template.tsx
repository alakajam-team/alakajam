import * as postMacros from "server/post/post.macros";
import { BookshelfModel } from "bookshelf";
import { User } from "server/entity/user.entity";

export default function ajaxLikes(context: { post: BookshelfModel; user: User; userLikes: any }) {
  return postMacros.postLikes(context.post, { readingUser: context.user, readingUserLikes: context.userLikes });
}
