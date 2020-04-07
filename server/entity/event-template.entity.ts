import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";
import { ColumnTypes } from "./column-types";
import { EventLink } from "./event-details.entity";
import { EventPreset } from "./event-preset.entity";
import { EventDivisions } from "./event.entity";

@Entity()
export class EventTemplate extends BookshelfCompatibleEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column(ColumnTypes.varchar({ nullable: true }))
  public title: string;

  /**
   * Default event title
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public event_title: string;

  /**
   * Default event preset
   */
  @Column({ nullable: true })
  public event_preset_id: number;

  @ManyToOne(() => EventPreset, undefined)
  public eventPreset: EventPreset;

  /**
   * Default spacial pages (to be applied in EventDetails)
   */
  @Column(ColumnTypes.json({ nullable: true, length: 2000 }))
  public links: EventLink[];

  /**
   * Default divisions info (to be applied in Event)
   */
  @Column(ColumnTypes.json({ nullable: true, length: 2000 }))
  public divisions: EventDivisions;

  /**
   * Default category names (to be applied in EventDetails)
   */
  @Column(ColumnTypes.json({ nullable: true, length: 1000 }))
  public category_titles: string[];

  public dependents(): Array<keyof this> {
    return [];
  }

}
