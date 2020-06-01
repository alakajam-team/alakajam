import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ColumnTypes } from "./column-types";
import { Entry } from "./entry.entity";
import { TimestampedEntity } from "./timestamped.entity";
import { User } from "./user.entity";

@Entity()
export class EntryScore extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public user_id: number;

  @ManyToOne(() => User, (user) => user.entryScores)
  @JoinColumn({ name: "user_id" })
  public user: User;

  @Column()
  public entry_id: number;

  @ManyToOne(() => Entry, (entry) => entry.scores)
  @JoinColumn({ name: "entry_id" })
  public entry: Entry;

  /**
    * Score ([-999.999.999.999,999;999.999.999.999,999],
    */
  @Column()
  public score: number;

  /**
    * URL of the proof picture or video
    */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public proof: string;

  /**
    * User ranking on that entry
    */
  @Column({ nullable: true })
  public ranking: number;

  @Column({ nullable: true, default: true })
  public active: boolean;

  /**
    * Submission time
    */
  @Column(ColumnTypes.dateTime({ default: () => "NOW()" }))
  @Index()
  public submitted_at: Date;

  public dependents(): Array<keyof this> {
    return [];
  }

}
