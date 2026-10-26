import { Column, Entity, Index, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm";
import { ColumnTypes } from "./column-types";
import { Node } from "./node.entity";
import { Relation } from "./relation";
import { TimestampedEntity } from "./timestamped.entity";
import { User } from "./user.entity";

@Entity()
export class Like extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * ID of the target node (post or entry)
   */
  @Column()
  @Index()
  public node_id: number;

  @ManyToOne(() => Node, (node) => node.likes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "node_id" })
  public node: Relation<Node>;

  /**
   * Author user ID
   */
  @Column()
  public user_id: number;

  @ManyToOne(() => User, (user) => user.likes)
  @JoinColumn({ name: "user_id" })
  public user: Relation<User>;

  /**
   * Like type
   */
  @Column(ColumnTypes.varchar())
  public type: string;

  public dependents(): Array<keyof this> {
    return [];
  }

}
