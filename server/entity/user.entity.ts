/* tslint:disable:variable-name */

import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { TimestampedEntity } from "./timestamped.entity";
import { UserDetails } from "./user-details.entity";

/**
 * User account information.
 */
@Entity()
export class User extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ unique: true })
  public name: string;

  @Column({ nullable: true })
  public title: string;

  @Column({ unique: true })
  public email: string;

  @Column({ nullable: true })
  public avatar: string;

  @Column({ nullable: true })
  public timezone: string;

  /**
   * "true" if set ("1" on SQLite), "" or NULL otherwise.
   * TODO Migrate to boolean
   */
  @Column({ default: false, nullable: true })
  public is_mod: string;

  /**
   * "true" if set ("1" on SQLite), "" or NULL otherwise.
   * TODO Migrate to boolean
   */
  @Column({ default: false, nullable: true })
  public is_admin: string;

  @Column({ default: false })
  public disallow_anonymous: boolean;

  @Column()
  public password: string;

  @Column()
  public password_salt: string;

  @Column({ nullable: true })
  public notifications_last_read: Date;

  @OneToOne((type) => UserDetails, (userDetails) => userDetails.user, { nullable: false, cascade: true })
  public details: UserDetails;

  public dependents(): Array<keyof this> {
    return [ "details" ];
  }

  // Missing: Posts

}
