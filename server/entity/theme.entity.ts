import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { ColumnTypes } from "./column-types";
import { Event } from "./event.entity";
import { TimestampedEntity } from "./timestamped.entity";
import { User } from "./user.entity";
import { ThemeVote } from "./theme-vote.entity";

@Entity()
export class Theme extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public event_id: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "event_id" })
  public event: Event;

  @Column()
  public user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  public user: User;
  /**
   * Max size: 100
   */
  @Column(ColumnTypes.varchar({ length: 100 }))
  public title: string;

  /**
   * Used for detecting duplicate themes
   */
  @Column(ColumnTypes.varchar({ length: 100 }))
  @Index()
  public slug: string;

  /**
   * [-9.999;9.999]
   */
  @Column({ default: 0 })
  @Index()
  public score: number;

  /**
   * [-9.999;9.999]
   */
  @Column(ColumnTypes.numeric(4, 3, { default: 0 }))
  @Index()
  public normalized_score: number;

  /**
   * Rough ranking in percentage ([-9.999;9.999])
   */
  @Column(ColumnTypes.numeric(4, 3, { nullable: true }))
  public ranking: number;

  /**
   * Lowest scores are eliminated or will soon ([-9.999;9.999])
   */
  @Column(ColumnTypes.numeric(4, 3, { default: 1 }))
  @Index()
  public rating_elimination: number;

  /**
   * Highest scores are to be chosen for the shortlist ([-9.999;9.999])
   */
  @Column(ColumnTypes.numeric(4, 3, { default: 0 }))
  @Index()
  public rating_shortlist: number;

  /**
   * Total notes (defaults to 0)
   */
  @Column({ default: 0 })
  @Index()
  public notes: number;

  /**
   * Total reports (defaults to 0)
   */
  @Column({ default: 0})
  public reports: number;

  @Column()
  @Index()
  public status: "active" | "out" | "banned" | "shortlist";

  @OneToMany(() => ThemeVote, (themeVote) => themeVote.theme)
  public votes: ThemeVote[];

  public dependents(): Array<keyof this> {
    return ["votes"];
  }

}
