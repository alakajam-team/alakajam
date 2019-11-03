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

  @Column({ default: false })
  public is_mod: string; // XXX "true" or ""

  @Column({ default: false })
  public is_admin: string; // XXX "true" or ""

  @Column({ default: false })
  public disallow_anonymous: boolean;

  @Column()
  public password: string;

  @Column()
  public password_salt: string;

  @Column({ nullable: true })
  public notifications_last_read: Date;

  @OneToOne((type) => UserDetails, (userDetails) => userDetails.user, { nullable: false })
  public details: UserDetails;

  // Missing: Posts

}
