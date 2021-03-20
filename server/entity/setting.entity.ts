import { Column, Entity, PrimaryColumn, PrimaryColumnOptions } from "typeorm";
import { ColumnTypes } from "./column-types";
import { TimestampedEntity } from "./timestamped.entity";

@Entity()
export class Setting extends TimestampedEntity {

  @PrimaryColumn(ColumnTypes.varchar() as PrimaryColumnOptions)
  // TODO @Index()
  public key: string;

  @Column(ColumnTypes.varchar({ length: 10000, nullable: true }))
  public value: string;

  public dependents(): Array<keyof this> {
    return [];
  }

}
