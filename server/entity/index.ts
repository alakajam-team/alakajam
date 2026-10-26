import { AnonymousCommentUser } from "./anonymous-comment-user.entity";
import { Comment } from "./comment.entity";
import { EntryDetails } from "./entry-details.entity";
import { EntryInvite } from "./entry-invite.entity";
import { EntryPlatform } from "./entry-platform.entity";
import { EntryScore } from "./entry-score.entity";
import { EntryTag } from "./entry-tag.entity";
import { EntryVote } from "./entry-vote.entity";
import { Entry } from "./entry.entity";
import { EventDetails } from "./event-details.entity";
import { EventParticipation } from "./event-participation.entity";
import { EventPreset } from "./event-preset.entity";
import { EventTemplate } from "./event-template.entity";
import { Event } from "./event.entity";
import { Like } from "./like.entity";
import { Platform } from "./platform.entity";
import { Post } from "./post.entity";
import { Setting } from "./setting.entity";
import { Tag } from "./tag.entity";
import { ThemeVote } from "./theme-vote.entity";
import { Theme } from "./theme.entity";
import { TournamentEntry } from "./tournament-entry.entity";
import { TournamentScore } from "./tournament-score.entity";
import { UserDetails } from "./user-details.entity";
import { UserMarketing } from "./user-marketing.entity";
import { UserRole } from "./user-role.entity";
import { User } from "./user.entity";

/**
 * Every class decorated with @Entity, registered explicitly in TypeORM's connection options
 * (rather than discovered through a file glob) so that all module systems share the same class instances.
 * New entities must be added here.
 */
export const entities = [
  AnonymousCommentUser,
  Comment,
  Entry,
  EntryDetails,
  EntryInvite,
  EntryPlatform,
  EntryScore,
  EntryTag,
  EntryVote,
  Event,
  EventDetails,
  EventParticipation,
  EventPreset,
  EventTemplate,
  Like,
  Platform,
  Post,
  Setting,
  Tag,
  Theme,
  ThemeVote,
  TournamentEntry,
  TournamentScore,
  User,
  UserDetails,
  UserMarketing,
  UserRole
];
