import { Column, Entity, Index, PrimaryGeneratedColumn, OneToOne, JoinColumn } from "typeorm";
import { ColumnTypes } from "./column-types";
import { TimestampedEntity } from "./timestamped.entity";
import { Entry } from "./entry.entity";

@Entity()
export class EntryDetails extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public entry_id: number;

  @OneToOne(() => Entry, (entry) => entry.details)
  @JoinColumn({ name: "entry_id" })
  public entry: Entry;

  /**
   * Detailed description
   */
  @Column(ColumnTypes.varchar({ nullable: true, length: 100000 }))
  public body: string;

  /**
   * Opted-out categories (JSON: [category_title])
   */
  @Column(ColumnTypes.json({ nullable: true, length: 255 }))
  public optouts: string[];

  /**
   * Rating for categories 1 to 6 ([-99.999,99.999])
   */
  @Column(ColumnTypes.numeric(5, 3, { nullable: true }))
  public rating_1: number;
  @Column(ColumnTypes.numeric(5, 3, { nullable: true }))
  public rating_2: number;
  @Column(ColumnTypes.numeric(5, 3, { nullable: true }))
  public rating_3: number;
  @Column(ColumnTypes.numeric(5, 3, { nullable: true }))
  public rating_4: number;
  @Column(ColumnTypes.numeric(5, 3, { nullable: true }))
  public rating_5: number;
  @Column(ColumnTypes.numeric(5, 3, { nullable: true }))
  public rating_6: number;
  @Column(ColumnTypes.numeric(5, 3, { nullable: true }))
  public rating_7: number;

  /**
   * Ranking for categories 1 to 6 (max: 100000)
   */
  @Column({ nullable: true })
  @Index()
  public ranking_1: number;
  @Column({ nullable: true })
  @Index()
  public ranking_2: number;
  @Column({ nullable: true })
  @Index()
  public ranking_3: number;
  @Column({ nullable: true })
  @Index()
  public ranking_4: number;
  @Column({ nullable: true })
  @Index()
  public ranking_5: number;
  @Column({ nullable: true })
  @Index()
  public ranking_6: number;
  @Column({ nullable: true })
  @Index()
  public ranking_7: number;

  /**
   * Received rating count
   */
  @Column({ nullable: true, default: 0 })
  @Index()
  public rating_count: number;

  /**
   * Submitted scores count
   */
  @Column({ nullable: true })
  public high_score_count: number;

  /**
   * 'number', 'time' or any custom text to be used as a suffix (max size: 20)
   */
  @Column(ColumnTypes.varchar({ nullable: true, length: 20 }))
  public high_score_type: string;

  /**
   * Markdown text to be shown when submitting a score (max size: 200
   */
  @Column(ColumnTypes.varchar({ nullable: true, length: 2000 }))
  public high_score_instructions: string;

  /**
   * Whether the authors allow using the game for tournaments0)
   */
  @Column({ nullable: true })
  public allow_tournament_use: boolean;

  public dependents(): Array<keyof this> {
    return [];
  }

}
