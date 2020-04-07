/* eslint-disable camelcase */

import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { TimestampedEntity } from "./timestamped.entity";
import { ColumnTypes } from "./column-types";

@Entity()
export class Platform extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column(ColumnTypes.varchar({ unique: true, length: 32 }))
  @Index()
  public name: string;

  public dependents(): Array<keyof this> {
    return [];
  }

}
