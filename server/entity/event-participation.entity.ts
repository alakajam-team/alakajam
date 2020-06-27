import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Event } from "./event.entity";
import { User } from "./user.entity";

export type StreamerStatus = "off" | "requested" | "approved" | "banned";

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

  @Column({ name: "streamer_status", nullable: true })
  public streamerStatus: "off" | "requested" | "approved" | "banned";

  @Column({ name: "streamer_description", length: 2000, nullable: true })
  public streamerDescription: string;

  public get isStreamer(): boolean {
    return this.streamerStatus && this.streamerStatus !== "off";
  }

  public get isApprovedStreamer(): boolean {
    return this.streamerStatus === "approved";
  }

}
