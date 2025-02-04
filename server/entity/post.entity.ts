

import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ColumnTypes } from "./column-types";
import { Entry } from "./entry.entity";
import { Event } from "./event.entity";
import { TimestampedEntity } from "./timestamped.entity";
import { User } from "./user.entity";

@Entity()
export class Post extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * Author user ID
   */
  @Column()
  public author_user_id: number;

  @ManyToOne(() => User, (user) => user.posts)
  @JoinColumn({ name: "author_user_id" })
  public author: User;

  /**
   * Name (used in the URL)
   */
  @Column(ColumnTypes.varchar())
  public name: string;

  /**
   * Title
   */
  @Column(ColumnTypes.varchar())
  public title: string;

  @Column({ nullable: true })
  public entry_id: number;

  @ManyToOne(() => Entry)
  @JoinColumn({ name: "entry_id" })
  public entry: Entry;

  @Column({ nullable: true })
  public event_id: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "event_id" })
  public event: Event;

  /**
   * Post body
   */
  @Column(ColumnTypes.varchar({ length: 100000, nullable: true }))
  public body: string;

  /**
   * 'announcement', 'hidden' or empty
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public special_post_type: string;

  /**
   * Number of comments made on this post
   */
  @Column({ nullable: true })
  public comment_count: number;

  /**
   * Publication time
   */
  @Column(ColumnTypes.dateTime({ nullable: true }))
  @Index()
  public published_at: Date;

  /**
   * Number of likes of any type on this post
   */
  @Column({ default: 0 })
  public like_count: number;

  @Column(ColumnTypes.json({ length: 500, default: "[]" }))
  public like_details: {[type: string]: number};

  /**
   * ([-99999.999;99999.999], the higher the hotter)
   * TODO Migrate scale to 5 for better accuracy (3 was a mistake)
   */
  @Column(ColumnTypes.numeric(8, 3, { default: 0 }))
  @Index()
  public hotness: number;

  public dependents(): Array<keyof this> {
    return []; // ["likes" /* TODO handle morph relation */, "comments", "userRoles"]; // careful of issue #93 when trying to restore
  }

}
