/* eslint-disable camelcase */

import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, CreateDateColumn, Index } from "typeorm";
import { TimestampedEntity } from "./timestamped.entity";
import { UserDetails } from "./user-details.entity";
import { UserRole } from "./user-role.entity";
import { ColumnTypes } from "./column-types";

/**
 * User account information.
 */
@Entity()
export class User extends TimestampedEntity {

  public constructor(name: string, email: string) {
    super();
    this.name = name;
    this.email = email;
    this.title = name;
    this.details = new UserDetails();
  }

  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * (NB. Lowercase name is indexed / no TypeORM support)
   */
  @Column(ColumnTypes.varchar({ unique: true }))
  public name: string;

  @Column(ColumnTypes.varchar({ nullable: true }))
  public title: string;

  @Column(ColumnTypes.varchar())
  // TODO @Unique
  public email: string;

  @Column(ColumnTypes.varchar({ nullable: true }))
  public avatar: string;

  @Column(ColumnTypes.varchar({ nullable: true }))
  public timezone: string;

  /**
   * "true" if set ("1" on SQLite), "" or NULL otherwise.
   * TODO Migrate to boolean
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public is_mod: string;

  /**
   * "true" if set ("1" on SQLite), "" or NULL otherwise.
   * TODO Migrate to boolean
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public is_admin: string;

  /**
   * If true, disallows this user to post anonymous comments
   */
  @Column({ nullable: true })
  public disallow_anonymous: boolean;

  @Column(ColumnTypes.varchar())
  public password: string;

  @Column(ColumnTypes.varchar())
  public password_salt: string;

  @CreateDateColumn(ColumnTypes.dateTime({ nullable: true, default: () => undefined }))
  public notifications_last_read: Date;

  @OneToOne(() => UserDetails, (userDetails) => userDetails.user, { cascade: true })
  public details: UserDetails;

  @OneToMany(() => UserRole, (userRole) => userRole.user, { cascade: true })
  public roles: UserRole[];

  public dependents(): Array<keyof this> {
    return [ "details", "roles", "entryScores", "tournamentScores", "comments", "posts", "likes", "themeVotes"];
  }

}
