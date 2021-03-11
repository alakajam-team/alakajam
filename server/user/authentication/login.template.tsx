import React, { JSX } from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import config from "server/core/config";
import * as formMacros from "server/macros/form.macros";
import { ifNotSet, ifSet, ifTrue } from "server/macros/jsx-utils";

export default function render(context: CommonLocals): JSX.Element {
  const { path, user, redirect } = context;

  return base(context,
    <div class="container thinner mt-5">
      <div class="card">
        <div class="card-body">
          <h1>Login</h1>

          {ifTrue(config.READ_ONLY_MODE, () =>
            <div class="alert alert-warning">
              <b>Website in read-only mode</b><br />
              Logging in has been deactivated temporarily by the administrators. Sorry for the inconvenience.
            </div>
          )}

          {formMacros.alerts(context.alerts)}

          {ifNotSet(user, () =>
            <form method="post" action={path !== "/logout" ? path : "/login"}>
              {context.csrfToken()}
              <div class="form-group">
                <label for="username">Username</label>
                <input type="text" class="form-control" id="name" name="name" required autofocus />
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" class="form-control" id="password" name="password" required />
              </div>
              <div class="form-group">
                <div class="checkbox">
                  <label>
                    <input type="checkbox" name="remember-me" /> Remember me
                  </label>
                </div>
              </div>
              <div class="form-group">
                <input type="hidden" name="redirect" value={redirect} />
                <button type="submit" class="btn btn-primary btn-block btn-lg">Submit</button>
              </div>
              <div class="text-right">
                <a href="/register" class="btn btn-sm btn-outline-secondary mr-1">I don't have an account</a>
                <a href="/passwordRecoveryRequest" class="btn btn-sm btn-outline-secondary">I forgot my password</a>
              </div>
            </form>
          )}

          {ifSet(user, () =>
            <p>You are logged in as <b>{user.get("name")}.</b></p>
          )}
        </div>
      </div>
    </div>
  );
}
