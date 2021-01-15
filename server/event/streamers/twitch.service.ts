import { BookshelfModel } from "bookshelf";
import { clamp } from "lodash";
import cache, { TTL_ONE_MINUTE } from "server/core/cache";
import config from "server/core/config";
import constants from "server/core/constants";
import log from "server/core/log";
import { User } from "server/entity/user.entity";
import { ApiClient, ClientCredentialsAuthProvider, HelixStream } from "twitch";
import eventParticipationService from "../dashboard/event-participation.service";

export class TwitchService {

  private twitchClient?: ApiClient;

  public constructor() {
    if (config.TWITCH_CLIENT_ID && config.TWITCH_CLIENT_SECRET) {
      const authProvider = new ClientCredentialsAuthProvider(config.TWITCH_CLIENT_ID, config.TWITCH_CLIENT_SECRET);
      this.twitchClient = new ApiClient({ authProvider });
    }
  }

  public async isLive(user: User): Promise<boolean> {
    try {
      const twitchUsername = user.details.social_links?.twitch;
      if (twitchUsername) {
        return (await this.listCurrentLiveStreams([twitchUsername])).length > 0;
      } else {
        return false;
      }
    } catch (e) {
      log.error(`Failed to check whether ${user.get("name")} is live`, e);
      return false;
    }
  }

  public async listCurrentLiveUsers(event: BookshelfModel, options: { alakajamRelatedOnly?: boolean } = {}): Promise<User[]> {
    const cacheKey = "currentLiveChannels-" + event.get("name") + "-" + (options.alakajamRelatedOnly ? "akj" : "all");
    return cache.getOrFetch(cache.general, cacheKey, async () => {
      if (!event || !this.twitchClient) {
        return [];
      }

      try {
        const eventParticipations = await eventParticipationService.getEventParticipations(event, { filter: "streamers" });
        const streamerChannels = eventParticipations
          .map(ep => ep.user.details.social_links?.twitch)
          .filter(channel => Boolean(channel));
        const userByChannelName: Record<string, User> = {};
        for (const ep of eventParticipations) {
          const twitchChannel = ep.user.details.social_links?.twitch;
          if (twitchChannel) {
            userByChannelName[twitchChannel.toLowerCase()] = ep.user;
          }
        }

        const streams = await this.listCurrentLiveStreams(streamerChannels);
        return streams
          .filter((stream) => options.alakajamRelatedOnly ? this.isAlakajamRelatedStream(stream.title) : true)
          .map((stream) => userByChannelName[stream.userDisplayName.toLowerCase()]);
      } catch (e) {
        log.error("Failed to list live streamers", e);
        return []; // Do not block the website because Twitch failed
      }
    }, TTL_ONE_MINUTE);
  }

  private isAlakajamRelatedStream(title: string): boolean {
    const lowerCaseTitle = title.toLowerCase();
    return constants.TWITCH_KEYWORDS.find(keyword => lowerCaseTitle.includes(keyword.toLowerCase())) !== undefined;
  }

  private async listCurrentLiveStreams(channels: string[]): Promise<HelixStream[]> {
    if (this.twitchClient && channels.length > 0) {
      const streams = await this.twitchClient.helix.streams.getStreams({
        userName: channels,
        limit: clamp(channels.length, 1, 100).toString()
      });
      return streams.data;
    } else {
      return [];
    }
  }

}

export default new TwitchService();
