import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";
import { ColumnTypes } from "./column-types";
import { Node } from "./node.entity";
import { Relation } from "./relation";
import { User } from "./user.entity";

@Entity()
export class Comment extends BookshelfCompatibleEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * ID of the target node (post or entry)
   */
  @Column()
  @Index()
  public node_id: number;

  @ManyToOne(() => Node, (node) => node.comments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "node_id" })
  public node: Relation<Node>;

  /**
   * Author user ID
   */
  @Column()
  public user_id: number;

  @OneToOne(() => User, (user) => user.comments)
  @JoinColumn({ name: "user_id" })
  public user: Relation<User>;

  /**
   * Parent comment ID
   */
  @Column({ nullable: true })
  public parent_id: number;

  @OneToOne(() => Comment, undefined, { nullable: true })
  @JoinColumn({ name: "parent_id" })
  public comment: Relation<Comment>;

  /**
   * Comment body
   */
  @Column(ColumnTypes.varchar({ length: 10000, nullable: true }))
  public body: string;

  /**
   * Karma gained through this comment (between 1 & 3)
   */
  @Column({ default: 0 })
  public karma: 1 | 2 | 3;

  @CreateDateColumn(ColumnTypes.dateTime())
  @Index()
  public created_at: Date;

  @UpdateDateColumn(ColumnTypes.dateTime())
  @Index()
  public updated_at: Date;

  public dependents(): Array<keyof this> {
    return [];
  }

  /**
   * Tells whether a model has been edited > 1 hour after its creation
   * @param  {Model} model Any model with timestamps
   * @return {bool}
   */
  public wasEdited(): boolean {
    return this.updated_at.getTime() - this.created_at.getTime() > 3600 * 1000;
  }

}
