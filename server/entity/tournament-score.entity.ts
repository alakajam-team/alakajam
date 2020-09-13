import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { ColumnTypes } from "./column-types";
import { TimestampedEntity } from "./timestamped.entity";
import { Event } from "./event.entity";
import { User } from "./user.entity";

export interface EntryScoresMap {
  [entryId: number]: {score: number; ranking: number};
};

@Entity()
export class TournamentScore extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public user_id: number;

  @ManyToOne(() => User, (user) => user.tournamentScores)
  @JoinColumn({ name: "user_id" })
  public user: User;

  /**
   * Tournament event ID
   */
  @Column()
  public event_id: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "event_id" })
  public entry: Event;

  /**
   * [-999.999.999.999,999;999.999.999.999,999]
   */
  @Column(ColumnTypes.numeric(15, 3, { default: 0 }))
  public score: number;

  /**
   * JSON caching of the entry scores used to compute the tournament score: {entryId: {score, ranking}}
   */
  @Column(ColumnTypes.json({ nullable: true, length: 1000 }))
  public entry_scores: EntryScoresMap;

  /**
   * User ranking on that tournament
   */
  @Column({ nullable: true })
  public ranking: number;

  public dependents(): Array<keyof this> {
    return [];
  }

}
