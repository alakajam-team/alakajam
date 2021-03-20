import { TimestampedEntity } from "./timestamped.entity";
import { PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, Entity } from "typeorm";
import { Event } from "./event.entity";
import { ColumnTypes } from "./column-types";
import constants from "server/core/constants";

export interface EventLink {
  title: string;
  link: string;
  icon: string;
}

export interface EventFlags {
  streamerOnlyTournament?: boolean;
  specialAwards?: boolean;
  hideStreamerMenu?: boolean;
  hideThemeResultsDetails?: boolean;
  rankedKarmaModifier?: boolean;
}

export interface ThemeShortlistEliminationState {
  /**
   * ISO date
   */
  nextElimination?: string;
  minutesBetweenEliminations?: number;
  eliminatedCount?: number;
}

@Entity()
export class EventDetails extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public event_id: number;

  @OneToOne(() => Event, (event) => event.details, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  public event: Event;

  /**
    * Category names
    */
  @Column(ColumnTypes.json({ nullable: true }))
  public category_titles: string[];

  /**
    * Number of theme ideas submitted
    */
  @Column({ nullable: true })
  public theme_count: number;

  /**
    * Number of active themes
    */
  @Column({ nullable: true })
  public active_theme_count: number;

  /**
    * Number of theme votes
    */
  @Column({ nullable: true })
  public theme_vote_count: number;

  /**
    * Number of users who joined the event
    */
  @Column({ default: 0 })
  public participation_count: number;

  /**
    * Path to a banner picture
    * @deprecated
    */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public banner: string;

  /**
    * Path to a background picture
    */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public background: string;

  /**
    * Number of entries by division: {"name": count...}
    */
  @Column(ColumnTypes.json({ nullable: true, default: "{}", length: 2000 }))
  public division_counts: Record<string, number>;

  /**
    * Config for shortlist eliminations phase (JSON: {"start": date, "delay": number in minutes, "body": html}
    */
  @Column(ColumnTypes.json({ nullable: true, default: "{}", length: 2000 }))
  public shortlist_elimination: ThemeShortlistEliminationState;

  /**
   * Arbitrary Markdown do be displayed at the top of the theme voting page
   */
  @Column(ColumnTypes.varchar({ nullable: true, length: 2000 }))
  public theme_page_header: string;

  /**
    * Config for a list of special pages to link to: (JSON: [{"title": string, "link": string, "icon": string}]
    */
  @Column(ColumnTypes.json({ nullable: true, default: "[]", length: 2000 }))
  public links: EventLink[];

  @Column(ColumnTypes.json({ length: constants.MAX_BODY_ANY, default: "{}" }))
  public flags: EventFlags;

  @Column(ColumnTypes.json({ nullable: true, default: "[]" }))
  public special_award_titles: string[];

  public dependents(): Array<keyof this> {
    return [];
  }

}
