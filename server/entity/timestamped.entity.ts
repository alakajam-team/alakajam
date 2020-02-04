/* eslint-disable camelcase */

import { CreateDateColumn, UpdateDateColumn } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";
import { ColumnTypes } from "./column-types";

export abstract class TimestampedEntity extends BookshelfCompatibleEntity {

  @CreateDateColumn(ColumnTypes.dateTime({ nullable: true }))
  public created_at: Date;

  @UpdateDateColumn(ColumnTypes.dateTime({ nullable: true }))
  public updated_at: Date;

}
