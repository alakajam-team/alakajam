import { Column, CreateDateColumn, Entity, Index, OneToOne, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { ColumnTypes } from "./column-types";
import { EventDetails } from "./event-details.entity";
import { TimestampedEntity } from "./timestamped.entity";
import { EventPreset } from "./event-preset.entity";
import { Entry } from "./entry.entity";
import { EventParticipation } from "./event-participation.entity";

export type EventDivisions = Record<string, string>;

export type EventGlobalStatus = "pending" | "open" | "closed";
export type EventRulesStatus = "off" | number | string;
export type EventThemeStatus = "disabled" | "off" | "voting" | "shortlist" | "closed" | "results" | number;
export type EventEntryStatus = "off" | "open" | "open_unranked" | "closed";
export type EventResultsStatus = "disabled" | "off" | "voting" | "voting_rescue" | "results" | number;
export type EventTournamentStatus = "disabled" | "off" | "submission" | "playing" | "closed" | "results";

export interface EventCountdownConfig {
  date?: Date;
  phrase?: string;
  enabled?: boolean;
}

@Entity()
export class Event extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * Must have a hyphen to prevent clashing reserved root URLs
   */
  @Column(ColumnTypes.varchar({ unique: true }))
  // TODO @Index()
  public name: string;

  @Column(ColumnTypes.varchar())
  public title: string;

  @OneToOne(() => EventDetails, (eventDetails) => eventDetails.event, { cascade: true })
  public details: EventDetails;

  /**
   * Arbitrary dates string used for display only
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public display_dates: string;

  /**
   * Arbitrary event theme string used for display only
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public display_theme: string;

  /**
   * Path to a logo picture
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public logo: string;

  /**
   * Currently used state preset
   */
  @Column({ nullable: true })
  public event_preset_id: number;

  @ManyToOne(() => EventPreset, undefined, { nullable: true })
  @JoinColumn({ name: "event_preset_id" })
  public eventPreset: EventPreset;

  /**
   * General status
   */
  @Column(ColumnTypes.varchar())
  @Index()
  public status: EventGlobalStatus;

  /**
   * Event rules status
   */
  @Column(ColumnTypes.varchar())
  public status_rules: EventRulesStatus;

  /**
   * Theme voting status
   */
  @Column(ColumnTypes.varchar())
  public status_theme: EventThemeStatus;

  /**
   * Entry submission status
   */
  @Column(ColumnTypes.varchar())
  public status_entry: EventEntryStatus;

  /**
   * Entry ratings & results status
   */
  @Column(ColumnTypes.varchar())
  public status_results: EventResultsStatus;

  /**
   * High score tournament status
   */
  @Column(ColumnTypes.varchar())
  public status_tournament: EventTournamentStatus;

  /**
   * Home page countdown
   */
  @Column(ColumnTypes.json({ nullable: true }))
  public countdown_config: EventCountdownConfig;

  /**
   * Divisions info: {"name": "description"}
   */
  @Column(ColumnTypes.json({ nullable: true }))
  public divisions: EventDivisions;

  /**
   * Total number of entries (if a jam) or entrants (if a tournament) in the event.
   */
  @Column({ nullable: true, default: 0 })
  public entry_count: number;

  /**
   * Event start date, for sorting purposes
   */
  @CreateDateColumn(ColumnTypes.dateTime({ default: () => null, nullable: true }))
  @Index()
  public started_at: Date;

  @OneToMany(() => Entry, (entry) => entry.event)
  public entries: Entry[];

  @OneToMany(() => EventParticipation, (eventParticipation) => eventParticipation.event)
  public participations: EventParticipation[];

  public dependents(): Array<keyof this> {
    return ["details", "entries", "participations"];
  }

}
