/* eslint-disable camelcase */

import { Column, CreateDateColumn, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";
import { ColumnTypes } from "./column-types";
import { User } from "./user.entity";
import { Post } from "./post.entity";
import { Entry } from "./entry.entity";

@Entity()
@Index([ "node_id", "node_type" ])
export class Comment extends BookshelfCompatibleEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * ID of the target node
   */
  @Column()
  public node_id: number;

  /**
   * Type of the target node ('entry' or 'post')
   */
  @Column(ColumnTypes.varchar())
  public node_type: string;

  /*
  TODO
  @OneToMany(() => Post | Entry, (node: Post | Entry) => node.comments)
  private node: Post | Entry;
  */

  /**
   * Author user ID
   */
  @Column()
  public user_id: number;

  @OneToOne(() => User, (user) => user.comments)
  @JoinColumn({ name: "user_id" })
  public user: User;

  /**
   * Parent comment ID
   */
  @Column({ nullable: true })
  public parent_id: number;

  @OneToOne(() => Comment, undefined, { nullable: true })
  @JoinColumn({ name: "parent_id" })
  public comment: Comment;

  /**
   * Comment body
   */
  @Column(ColumnTypes.varchar({ length: 10000, nullable: true }))
  public body: string;

  /**
   * Karma gained through this comment (between 1 & 3)
   */
  @Column({ default: 0 })
  public karma: 1 | 2 | 3;

  @CreateDateColumn(ColumnTypes.dateTime())
  @Index()
  public created_at: Date;

  @UpdateDateColumn(ColumnTypes.dateTime())
  @Index()
  public updated_at: Date;

  public dependents(): Array<keyof this> {
    return [];
  }

  /**
   * Tells whether a model has been edited > 1 hour after its creation
   * @param  {Model} model Any model with timestamps
   * @return {bool}
   */
  wasEdited(): boolean {
    return this.updated_at.getTime() - this.created_at.getTime() > 3600 * 1000;
  }

}
