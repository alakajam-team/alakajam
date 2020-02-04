/* eslint-disable camelcase */

import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";
import { ColumnTypes } from "./column-types";
import { User } from "./user.entity";

/**
 * Extended user information, mostly containing the user profile page.
 */
@Entity()
export class UserDetails extends BookshelfCompatibleEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ unique: true })
  public user_id: number;

  @OneToOne((type) => User, (user) => user.details, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  public user: User;

  @Column(ColumnTypes.varchar({ length: 100000 }))
  public body: string;

  @Column(ColumnTypes.varchar({ length: 1000 }))
  public social_links: {[key: string]: string};

  public dependents(): Array<keyof this> {
    return [];
  }
}
