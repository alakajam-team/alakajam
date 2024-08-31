/* eslint-disable camelcase */

import { BookshelfModel } from "bookshelf";
import { BeforeInsert, BeforeUpdate, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";
import { ColumnTypes } from "./column-types";

export abstract class TimestampedEntity extends BookshelfCompatibleEntity {

  @CreateDateColumn(ColumnTypes.dateTime())
  public created_at: Date;

  @UpdateDateColumn(ColumnTypes.dateTime())
  public updated_at: Date;

  protected setTimestampsFromBookshelfModel(model: BookshelfModel): void {
    this.created_at = model.has("created_at") ? new Date(model.get("created_at")) : undefined;
    this.updated_at = model.has("updated_at") ? new Date(model.get("updated_at")) : undefined;
  }

  @BeforeInsert()
  public setCreateDate(): void {
    this.created_at = new Date();
    this.updated_at = new Date();
  }

  @BeforeUpdate()
  public setUpdateDate(): void {
    this.updated_at = new Date();
  }

}
