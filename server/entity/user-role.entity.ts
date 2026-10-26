import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Index } from "typeorm";
import { PermissionType, ColumnTypes } from "./column-types";
import { Event } from "./event.entity";
import { Node } from "./node.entity";
import { Relation } from "./relation";
import { TimestampedEntity } from "./timestamped.entity";
import { User } from "./user.entity";

/**
 * User role on a node (entry or post).
 * Serve as permissions.
 */
@Entity()
export class UserRole extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public user_id: number;

  @ManyToOne(() => User, (user) => user.roles)
  @JoinColumn({ name: "user_id" })
  public user: Relation<User>;

  @Column(ColumnTypes.varchar())
  public user_name: string;

  @Column(ColumnTypes.varchar({ nullable: true }))
  public user_title: string;

  /**
   * ID of the target node (post or entry)
   */
  @Column()
  @Index()
  public node_id: number;

  @ManyToOne(() => Node, (node) => node.userRoles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "node_id" })
  public node: Relation<Node>;

  @Column(ColumnTypes.varchar())
  public permission: PermissionType;

  @Column({ nullable: true })
  public event_id: number;

  @ManyToOne((type) => Event)
  @JoinColumn({ name: "event_id" })
  public event: Relation<Event>;

  public dependents(): Array<keyof this> {
    return [];
  }

}
