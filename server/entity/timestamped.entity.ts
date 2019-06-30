/* tslint:disable:variable-name */

import { CreateDateColumn, UpdateDateColumn } from "typeorm";
import { BookshelfCompatible } from "./bookshelf-compatible.entity";
import { ColumnTypes } from "./column-types";

export abstract class Timestamped extends BookshelfCompatible {

  @CreateDateColumn(ColumnTypes.dateTime({ nullable: true }))
  public created_at: Date;

  @UpdateDateColumn(ColumnTypes.dateTime({ nullable: true }))
  public updated_at: Date;

}
