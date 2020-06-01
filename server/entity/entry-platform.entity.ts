/* eslint-disable camelcase */

import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { ColumnTypes } from "./column-types";
import { Entry } from "./entry.entity";
import { Platform } from "./platform.entity";
import { TimestampedEntity } from "./timestamped.entity";

@Entity()
export class EntryPlatform extends TimestampedEntity {

  @PrimaryColumn()
  public platform_id: number;

  @OneToOne(() => Platform)
  @JoinColumn({ name: "platform_id" })
  public platform: Platform;

  @PrimaryColumn()
  public entry_id: number;

  @OneToOne(() => Entry, (entry) => entry.entryPlatforms)
  @JoinColumn({ name: "entry_id" })
  public entry: Entry;

  @Column(ColumnTypes.varchar())
  @Index()
  public platform_name: string;

  public dependents(): Array<keyof this> {
    return [];
  }

}
