/* eslint-disable camelcase */

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";
import { ColumnTypes } from "./column-types";

@Entity()
export class Tag extends BookshelfCompatibleEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column(ColumnTypes.varchar({ unique: true, length: 50 }))
  @Index()
  public value: string;

  @CreateDateColumn(ColumnTypes.dateTime())
  @Index()
  public created_at: Date;

  @UpdateDateColumn(ColumnTypes.dateTime())
  public updated_at: Date;

  public dependents(): Array<keyof this> {
    return [];
  }

}
