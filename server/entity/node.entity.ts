import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";
import { ColumnTypes, NodeType } from "./column-types";
import { Comment } from "./comment.entity";
import { Like } from "./like.entity";
import { Relation } from "./relation";
import { UserRole } from "./user-role.entity";

/**
 * Parent of posts and entries, which share their primary key with it.
 * Deleting a node cascades to its post or entry, and to its comments, likes and user roles.
 * Rows are managed automatically, see NodeSubscriber.
 */
@Entity()
export class Node extends BookshelfCompatibleEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column(ColumnTypes.varchar())
  public type: NodeType;

  @OneToMany(() => Comment, (comment) => comment.node)
  public comments: Relation<Comment[]>;

  @OneToMany(() => Like, (like) => like.node)
  public likes: Relation<Like[]>;

  @OneToMany(() => UserRole, (userRole) => userRole.node)
  public userRoles: Relation<UserRole[]>;

  public dependents(): Array<keyof this> {
    return [];
  }

}
