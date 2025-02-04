

import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { TimestampedEntity } from "./timestamped.entity";
import { ColumnTypes } from "./column-types";
import { BookshelfModel } from "bookshelf";

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

  public static fromBookshelfModel(model: BookshelfModel): Platform {
    if (!model) {
      return undefined;
    }

    const platform = new Platform();
    for (const key of Object.keys(model.attributes)) {
      platform[key] = model.attributes[key];
    }
    platform.setTimestampsFromBookshelfModel(model);
    return platform;
  }

}
