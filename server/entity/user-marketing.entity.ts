/* eslint-disable camelcase */

import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { ColumnTypes } from "./column-types";
import { TimestampedEntity } from "./timestamped.entity";
import UserMarketingSettingTransformer, { UserMarketingSetting, OFF_VALUE } from "./transformer/user-marketing-setting.transformer";
import { User } from "./user.entity";

/**
 * Settings and traces related to email campaigns
 */
@Entity()
export class UserMarketing extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ unique: true })
  public user_id: number;

  @OneToOne(() => User, (user) => user.details, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  public user: User;

  @Column(ColumnTypes.numeric(1, 0, { transformer: UserMarketingSettingTransformer, default: OFF_VALUE }))
  @Index()
  public setting: UserMarketingSetting = "off";

  @Column(ColumnTypes.dateTime())
  public last_notified_at: Date;

  public dependents(): Array<keyof this> {
    return [];
  }
}
