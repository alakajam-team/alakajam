import { BookshelfModel } from "bookshelf";
import React, { JSX } from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import { UserSocialLinks } from "server/entity/user-details.entity";
import { User } from "server/entity/user.entity";
import { ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";

export function userThumb(user: BookshelfModel | User, options: {
  fullWidth?: boolean;
  centered?: boolean;
  pending?: boolean;
} | number = {}): JSX.Element {
  // Add support as Array.map() callback
  if (typeof options === "number") {
    options = {};
  }

  return <div class={`user-thumb ${options.fullWidth ? "full-width" : "col-sm-4"} 
        ${options.centered ? "centered" : ""} ${options.pending ? "pending" : ""}`}>
    <div class="user-thumb__title">
      <a href={links.routeUrl(user, "user")}>
        <div class="user-thumb__avatar">
          {ifSet(user.get("avatar"), () =>
            <img src={links.pictureUrl(user.get("avatar"), user)} />
          )}
          {ifNotSet(user.get("avatar"), () =>
            <img src={links.staticUrl("/static/images/default-avatar.png")} />
          )}
        </div>
        {user.get("title")}
      </a>
    </div>
    {ifTrue(options.pending, () =>
      <div class="user-thumb__pending">
        Pending invite
      </div>
    )}
    <div class="user-thumb__name">
      {user.get("name")}
    </div>
    {ifTrue((user as any).entriesCount > 0, () =>
      <div class="user-thumb__entries">
        {(user as any).akjEntriesCount}<img src={links.staticUrl("/static/images/jamician32.png")} height="14" />
        {(user as any).entriesCount - (user as any).akjEntriesCount} ext
      </div>
    )}
  </div>;
}

export function userAvatar(user: User, options: { small?: boolean } = {}): JSX.Element {
  const src = user.get("avatar") ? links.pictureUrl(user.get("avatar"), user as any) : links.staticUrl("/static/images/default-avatar.png");
  return <a href={links.routeUrl(user, "user")}>
    <img class={options.small ? "small-avatar" : ""} src={src} />
  </a>;
}

export function userLink(user: User): JSX.Element {
  return <a href={links.routeUrl(user, "user")}>@{user.get("title")}</a>;
}

export function twitchLink(user: User): JSX.Element {
  const socialLinks: UserSocialLinks = user.related("details").get("social_links");
  if (socialLinks?.twitch) {
    return <a href={`https://www.twitch.tv/${socialLinks.twitch}`}>
      <img src={links.staticUrl("/static/images/social/twitch.png")} class="no-border mr-2" style="width: 32px" />{socialLinks.twitch}
    </a>;
  }
}

export function twitchEmbed(twitchUsername: string, options: { height?: number; autoplay?: boolean } = {}): JSX.Element {
  if (twitchUsername) {
    return <>
      <div id={`twitch-${twitchUsername}-embed`}></div>
      <script src="https://embed.twitch.tv/embed/v1.js"></script>
      <script type="text/javascript" dangerouslySetInnerHTML={{
        __html: `
        document.addEventListener("DOMContentLoaded", function() {
          var embed = new Twitch.Embed("twitch-${twitchUsername}-embed", {
            autoplay: ${options.autoplay ? "true" : "false"},
            muted: ${options.autoplay ? "true" : "false"},
            width: "100%",
            height: ${options.height ? options.height : "200" },
            layout: "video",
            channel: "${twitchUsername}"
          });
        });`}} />
    </>;
  }
}

export function registerTwitchEmbedScripts(context: CommonLocals): void {
  context.scripts.push("https://embed.twitch.tv/embed/v1.js");
}
