import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ColumnTypes } from "./column-types";
import { Entry } from "./entry.entity";
import { Event } from "./event.entity";
import { TimestampedEntity } from "./timestamped.entity";
import { User } from "./user.entity";

@Entity()
export class EntryVote extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * Entry ID
   */
  @Column()
  public entry_id: number;

  @ManyToOne(() => Entry, (entry) => entry.votes)
  @JoinColumn({ name: "entry_id" })
  public entry: Entry;

  /**
   * Event ID
   */
  @Column()
  public event_id: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "event_id" })
  public event: Event;

  /**
   * User ID
   */
  @Column()
  public user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  public user: User;

  /**
   * Vote for categories 1 to 6 ([-999.99,999.99])
   */
  @Column(ColumnTypes.numeric(5, 2, { nullable: true }))
  public vote_1: number;
  @Column(ColumnTypes.numeric(5, 2, { nullable: true }))
  public vote_2: number;
  @Column(ColumnTypes.numeric(5, 2, { nullable: true }))
  public vote_3: number;
  @Column(ColumnTypes.numeric(5, 2, { nullable: true }))
  public vote_4: number;
  @Column(ColumnTypes.numeric(5, 2, { nullable: true }))
  public vote_5: number;
  @Column(ColumnTypes.numeric(5, 2, { nullable: true }))
  public vote_6: number;
  @Column(ColumnTypes.numeric(5, 2, { nullable: true }))
  public vote_7: number;

  public dependents(): Array<keyof this> {
    return [];
  }

}
