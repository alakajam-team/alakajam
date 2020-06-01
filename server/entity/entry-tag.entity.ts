/* eslint-disable camelcase */

import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Entry } from "./entry.entity";
import { Tag } from "./tag.entity";
import { TimestampedEntity } from "./timestamped.entity";

@Entity()
export class EntryTag extends TimestampedEntity {

  @PrimaryColumn()
  public entry_id: number;

  @ManyToOne(() => Entry, (entry) => entry.tags)
  @JoinColumn({ name: "entry_id" })
  public entry: Entry;

  @PrimaryColumn()
  public tag_id: number;

  @ManyToOne(() => Tag)
  @JoinColumn({ name: "tag_id" })
  public tag: Tag;

  public dependents(): Array<keyof this> {
    return [];
  }

}
