import { expect } from "chai";
import { UserDetails } from "server/entity/user-details.entity";
import { User } from "server/entity/user.entity";
import youtubeService from "./youtube.service";

describe("Youtube service", () => {

  it("should convert a channel URL to an embed URL, without a trailing slash", () => {
    const user = stubUser("https://www.youtube.com/c/DanaePlays");
    const embedUrl = youtubeService.getEmbedUrl(user);
    expect(embedUrl).to.eq("https://www.youtube.com/embed/live_stream?channel=DanaePlays");
  });

  it("should convert a channel URL to an embed URL, with a trailing slash", () => {
    const user = stubUser("https://www.youtube.com/c/DanaePlays/");
    const embedUrl = youtubeService.getEmbedUrl(user);
    expect(embedUrl).to.eq("https://www.youtube.com/embed/live_stream?channel=DanaePlays");
  });

  function stubUser(youtubeChannelUrl: string) {
    const user = new User("name", "email");
    user.details = new UserDetails();
    user.details.social_links = {
      youtube: youtubeChannelUrl
    };
    return user;
  }

});
