/* eslint-disable camelcase */

import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";
import { ColumnTypes } from "./column-types";
import { User } from "./user.entity";

export interface UserSocialLinks {
  website?: string;
  twitter?: string;
  twitch?: string;
  youtube?: string;
}

/**
 * Extended user information, mostly containing the user profile page.
 */
@Entity()
export class UserDetails extends BookshelfCompatibleEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ unique: true })
  public user_id: number;

  @OneToOne(() => User, (user) => user.details, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  public user: User;

  @Column(ColumnTypes.varchar({ length: 100000, nullable: true }))
  public body: string;

  @Column(ColumnTypes.json({ nullable: true }))
  public social_links: UserSocialLinks;

  public dependents(): Array<keyof this> {
    return [];
  }
}
