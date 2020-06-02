import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Event } from "./event.entity";
import { User } from "./user.entity";

@Entity()
export class EventParticipation {

  public constructor(eventId: number, userId: number) {
    this.eventId = eventId;
    this.userId = userId;
  }

  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: "event_id" })
  public eventId: number;

  @ManyToOne(() => Event, (event) => event.participations)
  @JoinColumn({ name: "event_id" })
  public event: Event;

  @Column({ name: "user_id" })
  public userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  public user: User;

  @Column({ name: "is_streamer", nullable: true })
  public isStreamer: boolean | undefined;

  @Column({ name: "streamer_description", length: 2000, nullable: true })
  public streamerDescription: string;

}
