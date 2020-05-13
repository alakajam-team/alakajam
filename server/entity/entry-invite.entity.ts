import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { TimestampedEntity } from "./timestamped.entity";
import { ColumnTypes } from "./column-types";
import { Entry } from "./entry.entity";

@Entity()
export class EntryInvite extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * Target entry ID
   */
  @Column()
  public entry_id: number;

  @ManyToOne(() => Entry, (entry) => entry.invites)
  @JoinColumn({ name: "entry_id" })
  public entry: Entry;

  /**
   * User ID of the person invited
   */
  @Column()
  public invited_user_id: number;

  /**
   * User title of the person invited
   */
  @Column(ColumnTypes.varchar())
  public invited_user_title: string;

  /**
   * The offered permission
   */
  @Column(ColumnTypes.varchar())
  public permission: string;

  public dependents(): Array<keyof this> {
    return [];
  }

}
