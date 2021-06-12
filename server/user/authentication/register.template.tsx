import React, { JSX } from "preact";
import base from "server/base.template";
import constants from "server/core/constants";
import { markdown } from "server/core/templating-filters";
import * as formMacros from "server/macros/form.macros";
import * as userDashboardMacros from "server/user/dashboard/dashboard.macros";
import { RegisterContext } from "./register.controller";

export default function render(context: RegisterContext): JSX.Element {
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
              <input type="text" class="form-control" id="name" name="name" value={name} required autofocus />
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
              <label for="captcha-answer" dangerouslySetInnerHTML={markdown(captcha.questionMarkdown)} />
              <input type="hidden" name="captcha-key" value={captcha.key} />
              <input type="text" class="form-control" id="captcha" name="captcha-answer" placeholder="Type the answer" required />
            </div>
            <div id="gotcha-group" class="form-group">
              <div id="gotcha-explanation">This field is hidden. Please do not answer it.</div>
              <label for="gotcha">Are you an automaton?</label>
              <input type="text" class="form-control" id="gotcha" name="gotcha" value="" aria-describedby="gotcha-explanation" autocomplete="off" />
            </div>
            <div class="form-group">
              <div class="checkbox">
                <label>
                  <input type="checkbox" name="terms-and-conditions" />&nbsp;
                  I acknowledge and accept the website's <a target="akj-privacy" href="/article/about/privacy-policy">Privacy Policy</a>
                </label>
              </div>
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
