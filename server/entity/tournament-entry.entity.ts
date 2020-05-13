import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Entry } from "./entry.entity";
import { Event } from "./event.entity";
import { TimestampedEntity } from "./timestamped.entity";

@Entity()
export class TournamentEntry extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  /**
   * Tournament event ID
   */
  @Column()
  public event_id: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "event_id" })
  public event: Event;
  
  @Column()
  public entry_id: number;

  @ManyToOne(() => Entry)
  @JoinColumn({ name: "entry_id" })
  public entry: Entry;
  
  /**
   * Listing order
   */
  @Column({ default: 0, nullable: true })
  public ordering: number;

  /**
   * Whether the entry has been accepted.
   */
  @Column({ default: false, nullable: true })
  public active: boolean;

  public dependents(): Array<keyof this> {
    return [];
  }

}
