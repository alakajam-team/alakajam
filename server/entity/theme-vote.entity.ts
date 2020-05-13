import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Event } from "./event.entity";
import { Theme } from "./theme.entity";
import { TimestampedEntity } from "./timestamped.entity";
import { User } from "./user.entity";

@Entity()
export class ThemeVote extends TimestampedEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public theme_id: number;

  @ManyToOne(() => Theme)
  @JoinColumn({ name: "theme_id" })
  public theme: Theme;

  @Column()
  // TODO @Index()
  public event_id: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "event_id" })
  public event: Event;

  @Column()
  // TODO @Index()
  public user_id: number;

  @ManyToOne(() => User, (user) => user.themeVotes)
  @JoinColumn({ name: "user_id" })
  public user: User;

  @Column()
  public score: number;

  public dependents(): Array<keyof this> {
    return [];
  }

}
