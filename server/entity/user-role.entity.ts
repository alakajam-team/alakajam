

import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Index } from "typeorm";
import { NodeType, PermissionType, ColumnTypes } from "./column-types";
import { Event } from "./event.entity";
import { TimestampedEntity } from "./timestamped.entity";
import { User } from "./user.entity";

/**
 * User role on a node (entry or post).
 * Serve as permissions.
 */
@Entity()
@Index([ "node_id", "node_type" ])
export class UserRole extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public user_id: number;

  @ManyToOne(() => User, (user) => user.roles)
  @JoinColumn({ name: "user_id" })
  public user: User;

  @Column(ColumnTypes.varchar())
  public user_name: string;

  @Column(ColumnTypes.varchar({ nullable: true }))
  public user_title: string;

  @Column()
  public node_id: number;

  @Column(ColumnTypes.varchar())
  public node_type: NodeType;

  // @ManyToOne Node ?

  @Column(ColumnTypes.varchar())
  public permission: PermissionType;

  @Column({ nullable: true })
  public event_id: number;

  @ManyToOne((type) => Event)
  @JoinColumn({ name: "event_id" })
  public event: Event;

  public dependents(): Array<keyof this> {
    return [];
  }

}
