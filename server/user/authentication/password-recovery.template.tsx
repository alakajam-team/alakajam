import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import * as formMacros from "server/macros/form.macros";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";

export default function render(context: CommonLocals) {
  const { path, success, token } = context;

  return base(context,

    <div class="container">
      <div class="card thinner mt-5">
        <div class="card-body">
          {ifTrue(!success && token, () =>
            <div>
              <h1>Password recovery</h1>

              {formMacros.alerts(context.alerts)}

              <form method="post" action={path} >
                {context.csrfTokenJSX()}
                < div class="form-group" >
                  <label for="new-password">New password</label>
                  <input type="password" class="form-control" name="new-password" required />
                </div>
                <div class="form-group">
                  <label for="new-password-bis">Repeat password</label>
                  <input type="password" class="form-control" name="new-password-bis" required />
                </div>
                <button type="submit" class="btn btn-primary">Submit</button>
              </form>
            </div>
          )}
          {ifTrue(success, () =>
            <div>
              <p>Your password has been successfully changed!</p>
              <p><a href="/login" class="btn btn-primary">Login</a></p>
            </div>
          )}
          {ifFalse(token, () =>
            <div>
              <p>This token is !|| no longer valid. You can ask for a new one by following the link below.</p>
              <p><a href="/passwordRecoveryRequest" class="btn btn-primary">Password recovery request</a></p>
            </div>
          )}
        </div>
      </div >
    </div >
  );
}
