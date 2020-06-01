import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BookshelfCompatibleEntity } from "./bookshelf-compatible.entity";
import { ColumnTypes } from "./column-types";
import { Event, EventCountdownConfig, EventEntryStatus, EventGlobalStatus,
  EventResultsStatus, EventRulesStatus, EventThemeStatus, EventTournamentStatus } from "./event.entity";

@Entity()
export class EventPreset extends BookshelfCompatibleEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column(ColumnTypes.varchar({ nullable: true }))
  public title: string;

  /**
   * Global status
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public status: EventGlobalStatus;

  /**
   * Event rules status
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public status_rules: EventRulesStatus;

  /**
   * Theme voting status
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public status_theme: EventThemeStatus;

  /**
   * Entry submission status
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public status_entry: EventEntryStatus;

  /**
   * Event results status
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public status_results: EventResultsStatus;

  /**
   * Event tournament status
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public status_tournament: EventTournamentStatus;

  @OneToMany(() => Event, (event) => event.event_preset_id)
  public events: Event[];

  /**
   * Home page countdown JSON
   */
  @Column(ColumnTypes.json({ nullable: true }))
  public countdown_config: EventCountdownConfig;

  public dependents(): Array<keyof this> {
    return [];
  }

}
