import download from "download";
import cache from "server/core/cache";
import forms from "server/core/forms";
import { User } from "server/entity/user.entity";

export class YoutubeService {

  public async isLive(user: User): Promise<boolean> {
    const youtubeChannelUrl = user.details.social_links?.youtube;
    if (!forms.isURL(youtubeChannelUrl)) {
      return false;
    }

    const userCache = cache.user(user.name);
    return cache.getOrFetch(userCache, "isYoutubeLive", () => {
      return this.isChannelLive(youtubeChannelUrl);
    }, 60 /* seconds */);
  }

  public getEmbedUrl(user: User): string | undefined {
    let youtubeChannelUrl = user.details.social_links?.youtube;
    if (!forms.isURL(youtubeChannelUrl)) {
      return;
    }

    if (youtubeChannelUrl.endsWith("/")) {
      youtubeChannelUrl = youtubeChannelUrl.slice(0, youtubeChannelUrl.length - 1);
    }
    const channelUrlParts = youtubeChannelUrl.split("/");
    const channelId = channelUrlParts[channelUrlParts.length - 1];
    return `https://www.youtube.com/embed/live_stream?channel=${channelId}`;
  }

  private async isChannelLive(url: string): Promise<boolean> {
    // As of 2021, "YouTube Live Streaming API" is designed for streamers wanting to automate their livestreams,
    // not users just wanting to check if a channel is live. This makes authentication a complete chore.
    // Let's not bother.
    const channelHomePage: string = (await download(url)).toString();
    return channelHomePage.includes("thumbnailOverlayTimeStatusRenderer")
      && channelHomePage.includes('"style":"LIVE"');
  }

}

export default new YoutubeService();
