

import { Column, Entity, Index, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { ColumnTypes } from "./column-types";
import { TimestampedEntity } from "./timestamped.entity";
import { User } from "./user.entity";

@Entity()
@Index([ "node_id", "node_type" ])
export class Like extends TimestampedEntity {

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

  /**
   * Author user ID
   */
  @Column()
  public user_id: number;

  @ManyToOne(() => User, (user) => user.likes)
  @JoinColumn({ name: "user_id" })
  public user: User;

  /**
   * Like type
   */
  @Column(ColumnTypes.varchar())
  public type: string;

  public dependents(): Array<keyof this> {
    return [];
  }

}
