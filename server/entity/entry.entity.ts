import { Column, Entity, Index, JoinColumn, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { ColumnTypes } from "./column-types";
import { EntryDetails } from "./entry-details.entity";
import { EntryInvite } from "./entry-invite.entity";
import { EntryPlatform } from "./entry-platform.entity";
import { EntryScore } from "./entry-score.entity";
import { EntryTag } from "./entry-tag.entity";
import { EntryVote } from "./entry-vote.entity";
import { Event } from "./event.entity";
import { TimestampedEntity } from "./timestamped.entity";

export interface EntryPictures {
  previews?: string[];
  thumbnail?: string;
  icon?: string;
}

@Entity()
export class Entry extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @OneToOne(() => EntryDetails, (entryDetails) => entryDetails.entry)
  public details: EntryDetails;

  /**
   * Event ID (can be null in case of an external entry)
   */
  @Column({ nullable: true })
  public event_id: number;

  @ManyToOne(() => Event, (event) => event.entries, { nullable: true })
  @JoinColumn({ name: "event_id" })
  public event: Event;

  /**
   * Name (used in the URL, can be null in case of an external entry)
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public event_name: string;

  /**
   * External event title (if not an Alakajam! game, ie. event_id is null)
   */
  @Column({ nullable: true })
  @Index(ColumnTypes.varchar())
  public external_event: string;

  @Column(ColumnTypes.varchar())
  public name: string;

  @Column(ColumnTypes.varchar())
  public title: string;

  /**
   * (max size: 2000)
   */
  @Column(ColumnTypes.varchar({ length: 2000, nullable: true }))
  public description: string;

  /**
   * JSON Array : [{url, title}]
   */
  @Column(ColumnTypes.json({ nullable: true, length: 1000 }))
  public links: Array<{ url: string; title: string }>;

  /**
   * JSON Array : [platform]
   */
  @Column(ColumnTypes.json({ nullable: true, length: 1000 }))
  public platforms: string[];

  /**
   * JSON Array : [path]
   */
  @Column(ColumnTypes.json({ nullable: true, length: 1000 }))
  public pictures: EntryPictures;

  /**
   * "solo"/"team"/"unranked"
   */
  @Column(ColumnTypes.varchar({ default: "solo" }))
  @Index()
  public division: "solo" | "team" | "unranked";

  /**
   * [-999.999;999.999]
   */
  @Column(ColumnTypes.numeric(6,3, { default: 100 }))
  // TODO @Index()
  public karma: number;

  @Column(ColumnTypes.dateTime())
  public published_at: Date;

  @Column()
  public comment_count: number;

  /**
   * Are anonymous comments allowed on this entry?
   */
  @Column({ nullable: true })
  public allow_anonymous: boolean;

  /**
   * High score enablement status ('off', 'normal', 'reversed')
   */
  @Column(ColumnTypes.varchar({ nullable: true }))
  public status_high_score: "off" | "normal" | "reversed";

  /**
   * ([-999.99999;999.99999], the higher the hotter)
   */
  @Column(ColumnTypes.numeric(8, 3, { nullable: true, default: 0 }))
  @Index()
  public hotness: number;

  @OneToMany(() => EntryVote, (entryVote) => entryVote.entry)
  public votes: EntryVote[];

  @OneToMany(() => EntryInvite, (entryInvite) => entryInvite.entry)
  public invites: EntryInvite[];

  @OneToMany(() => EntryScore, (entryScore) => entryScore.entry)
  public scores: EntryScore[];

  @ManyToMany(() => EntryTag, (entryTag) => entryTag.entry)
  public tags: EntryTag[];

  @ManyToMany(() => EntryPlatform, (entryPlatform) => entryPlatform.entry)
  public entryPlatforms: EntryPlatform[];

  public dependents(): Array<keyof this> {
    return ["details", "entryPlatforms", "votes", "invites", "tags", "scores"];
  }

  /**
   * FIXME May be impossible to implement at entity level in TypeORM due to morph relation
   */
  /* public sortedUserRoles() {
    return this.userRoles.sortBy((userRole) => {
      // List owners first, otherwise sort alphabetically
      if (userRole.get("permission") === "manage") {
        return " " + userRole.get("user_title");
      } else {
        return userRole.get("user_title");
      }
    });
  }*/

  public picturePreviews(): string[] {
    if (this.pictures && this.pictures.previews) {
      return this.pictures.previews;
    } else {
      return [];
    }
  }

  public pictureThumbnail(): string {
    if (this.pictures) {
      return this.pictures.thumbnail;
    } else {
      return undefined;
    }
  }

  public pictureIcon(): string {
    if (this.pictures) {
      return this.pictures.icon;
    } else {
      return undefined;
    }
  }

}
