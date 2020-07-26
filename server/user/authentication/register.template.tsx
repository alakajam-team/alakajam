import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import constants from "server/core/constants";
import * as formMacros from "server/macros/form.macros";
import * as userDashboardMacros from "server/user/dashboard/dashboard.macros";

export default function render(context: CommonLocals) {
  const { name, email, timezones, timezone, captcha } = context;

  return base(context,
    <div class="container thinner">
      <div class="card">
        <div class="card-body">
          <h1>Register</h1>

          {formMacros.alerts(context.alerts)}

          <form method="post" action="/register">
            {context.csrfToken()}
            <div class="form-group">
              <label for="username">Username</label>
              <input type="text" class="form-control" id="name" name="name" value={name} required />
            </div>
            <div class="form-group">
              <label for="username">Email address</label>
              <p class="legend">
                Only used for password recovery or exceptional circumstances.
                Any upcoming feature involving emails will be opt-in.
              </p>
              <input type="email" class="form-control" id="email" name="email" value={email} required />
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" class="form-control" id="password" name="password"
                placeholder={`Type at least ${constants.PASSWORD_MIN_LENGTH} characters`} required />
            </div>
            <div class="form-group">
              <label for="password-bis">Repeat password</label>
              <input type="password" class="form-control" id="password-bis" name="password-bis" required />
            </div>
            {userDashboardMacros.timezoneField(timezones, timezone)}
            <div class="form-group">
              <label for="captcha">Are you human? (yes or no)</label>
              <input type="text" class="form-control" id="captcha" name="captcha" value={captcha} required />
            </div>
            <div class="form-group">
              <div class="checkbox">
                <label>
                  <input type="checkbox" name="remember-me" /> Remember me
                </label>
              </div>
            </div>
            <button type="submit" class="btn btn-primary">Submit</button>
          </form>
        </div>
      </div>
    </div>
  );
}
