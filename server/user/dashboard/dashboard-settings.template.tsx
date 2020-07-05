import * as React from "preact";
import { CommonLocals } from "server/common.middleware";
import links from "server/core/links";
import security from "server/core/security";
import * as formMacros from "server/macros/form.macros";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";
import * as userDashboardMacros from "server/user/dashboard/dashboard.macros";
import dashboardBase from "./dashboard.base.template";

export default function render(context: CommonLocals) {
  const { dashboardUser, dashboardAdminMode, timezones } = context;

  const socialLinks = dashboardUser.related("details").get("social_links");

  formMacros.registerEditorScripts(context);

  return dashboardBase(context,
    <div>
      <h1>Settings</h1>

      <form action={links.routeUrl(dashboardUser, "user", "settings", { dashboardAdminMode, query: "upload=avatar" })}
        method="post" enctype="multipart/form-data" class="js-warn-on-unsaved-changes">
        {context.csrfTokenJSX()}

        {ifTrue(dashboardAdminMode, () =>
          <div class="alert alert-danger">
            <h2>Admin settings</h2>

            <div class="form-group">
              <label for="name">Special permissions</label>
              <div>
                {ifFalse(security.isMod(dashboardUser), () =>
                  formMacros.radio("special_permissions", "none", "None", "none")
                )}
                {ifTrue(security.isMod(dashboardUser) && !security.isAdmin(dashboardUser), () =>
                  formMacros.radio("special_permissions", "mod", "Moderator", "mod")
                )}
                {ifTrue(security.isAdmin(dashboardUser), () =>
                  formMacros.radio("special_permissions", "admin", "Administrator", "admin")
                )}
              </div>
            </div>
            <div class="form-group">
              <label for="name">Anonymous posts</label>
              <div>
                {formMacros.check("disallow_anonymous", "Disallow posting anonymously", dashboardUser.get("disallow_anonymous"))}
              </div>
            </div>
            <div class="form-group">
              <input type="submit" class="btn btn-danger" value="Save changes" />
              <a href={"/user/" + dashboardUser.get("name")} class="btn btn-outline-secondary">View profile</a>
            </div>
          </div>
        )}

        <h2>Account</h2>

        <div class="row">
          <div class="col-md-6 col-lg-7">
            <div class="form-group">
              <label for="title">Display name</label>
              <input type="text" class="form-control input-lg" id="password" name="title"
                placeholder="Display name" value={dashboardUser.get("title")} />
            </div>

            <div class="form-group">
              <label for="name">Email address</label>
              {formMacros.tooltip("Only used for password recovery. Any upcoming feature involving emails will be opt-in.", { placement: "right" })}
              <input type="email" class="form-control" id="email" name="email"
                placeholder="Email address" value={dashboardUser.get("email")} required />
            </div>

            {userDashboardMacros.timezoneField(timezones, dashboardUser.get("timezone"))}

            <div class="form-group">
              <label for="twitter">
                <img src={links.staticUrl("/static/images/social/twitter.svg")} class="no-border mr-1" style="width: 20px" />
                Twitter username
              </label>
              <input type="text" class="form-control" id="twitter" name="twitter"
                placeholder="@username" value={socialLinks.twitter ? "@" + socialLinks.twitter : ""} />
            </div>

            <div class="form-group">
              <label for="twitch">
                <img src={links.staticUrl("/static/images/social/twitch.png")} class="no-border mr-1" style="width: 20px" />
                Twitch username
              </label>
              <input type="text" class="form-control" id="twitch" name="twitch" value={socialLinks.twitch} />
            </div>

            <div class="form-group">
              <label for="name"><span class="fas fa-home" style="color: black; font-size: 18px"></span> Website</label>
              <input type="url" class="form-control" id="website" name="website" placeholder="http://" value={socialLinks.website} />
            </div>

            <div class="form-group">
              <input type="submit" class="btn btn-primary" value="Save changes" />
              <a href={"/user/" + dashboardUser.get("name")} class="btn btn-outline-secondary">View profile</a>
            </div>
          </div>

          <div class="col-md-6 col-lg-5">
            <div class="form-group">
              <label for="name">Avatar</label>
              {formMacros.pictureInput("avatar", dashboardUser.get("avatar"), { model: dashboardUser })}
            </div>
          </div>
        </div>

        <h2 class="spacing">Bio</h2>

        <div class="row">
          <div class="col-md-12">
            <div class="form-group">
              {formMacros.editor("body", dashboardUser.related("details").get("body"))}
            </div>

            <div class="form-group">
              <input type="submit" class="btn btn-primary" value="Save changes" />
              <a href={"/user/" + dashboardUser.get("name")} class="btn btn-outline-secondary">View profile</a>
            </div>
          </div>
        </div>

      </form>

      <h2 class="spacing">Danger zone</h2>

      <form action={links.routeUrl(dashboardUser, "user", "settings", { dashboardAdminMode })} method="post">
        {context.csrfTokenJSX()}
        <div class="form-group">
          <input type="submit" name="delete" class="btn btn-danger" value="Delete account"
            onclick="return confirm('Delete your account permanently?
            This will REALLY delete all your data, including posts and comments.
            IMPORTANT: this will only work *after* you have manually deleted or left the team for all your entries.')" />
        </div>
      </form>
    </div>
  );
}
