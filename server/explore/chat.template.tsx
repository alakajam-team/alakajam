import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";

export default function render(context: CommonLocals) {
  context.inlineStyles.push(`
  .chat_bigicon {
    float: left;
    width: 80px;
    margin-right: 20px;
  }
  `);

  return base(context,
    <div class="container">
      <div class="row">
        <div class="col-12">
          <h1>Chat</h1>
        </div>
      </div>
      <div class="row">
        <div class="col-6">
          <div class="featured">
            <a href="https://discord.gg/yZPBpTn"><img src={links.staticUrl("static/images/social/discord.svg")} class="chat_bigicon no-border" /></a>

            <p><a href="https://discord.gg/yZPBpTn"><strong>Click this invite to join our Discord server.</strong></a></p>

            <p class="chat_legend">If you're not on Discord yet, <a href="https://discordapp.com/">check their website</a>{" "}
            to create an account and (optionally) install their desktop app.</p>
          </div>
        </div>
        <div class="col-6">
          <div class="featured">
            <img src={ links.staticUrl("static/images/social/irc.svg") } class="chat_bigicon" />

            <p><strong><code>server: irc.afternet.org, chan: #alakajam</code></strong></p>

            <p>You can use either the embedded chat below (<a href="https://kiwiirc.com/client/irc.afternet.org/?nick=user|?#alakajam"
              target="_akjchat">open in a new tab</a>), or your own preferred IRC client (e.g. <a href="https://hexchat.github.io/">HexChat</a>).</p>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-12">
          <h2>Embedded chat</h2>
          <iframe src="https://kiwiirc.com/client/irc.afternet.org/?nick=noob|?#akj-discord" style="border:0; width:100%; height:600px;">whop</iframe>
        </div>
      </div>
    </div>);

}
