import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { TimestampedEntity } from "./timestamped.entity";
import { ColumnTypes } from "./column-types";

@Entity()
export class EntryVote extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * Entry ID
   */
  @Column()
  public entry_id: number;

  /**
   * Event ID
   */
  @Column()
  public event_id: number;

  /**
   * User ID
   */
  @Column()
  public user_id: number;

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

  public dependents(): Array<keyof this> {
    return [];
  }

}
