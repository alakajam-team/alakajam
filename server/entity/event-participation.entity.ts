import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Event } from "./event.entity";
import { User } from "./user.entity";

@Entity()
export class EventParticipation {

  public constructor(eventId: number, userId: number) {
    this.event_id = eventId;
    this.user_id = userId;
  }

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public event_id: number;

  @ManyToOne(() => Event, (event) => event.participations)
  @JoinColumn({ name: "event_id" })
  public event: Event;

  @Column()
  public user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  public user: User;

}
