import { Entity, PrimaryColumn } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";

/**
 * Stores the actual user IDs of anonymous comments.
 * To be ONLY used for letting the actual users edit/delete their comments, or for moderation purposes.
 *
 * TODO
 * - Migrate to not nullable
 * - Migrate to create primary key
 */
@Entity()
export class AnonymousCommentUser extends BookshelfCompatibleEntity {

  @PrimaryColumn()
  public comment_id: number;

  @PrimaryColumn()
  public user_id: number;

  dependents(): Array<keyof this> {
    return [];
  }

}
