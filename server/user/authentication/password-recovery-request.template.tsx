import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import * as formMacros from "server/macros/form.macros";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";

export default function render(context: CommonLocals) {
  const { path, success } = context;

  return base(context,
    <div class="container">
      <div class="card thinner mt-5">
        <div class="card-body">
          {ifFalse(success, () =>
            <div>
              <h1>Password recovery request</h1>

              {formMacros.alerts(context.alerts)}

              <p>Please fill the email address you used to register.</p>

              <form method="post" action={path}>
                {context.csrfToken()}
                <div class="form-group">
                  <label for="email">Email</label>
                  <input type="text" class="form-control" name="email" required autofocus />
                </div>
                <button type="submit" class="btn btn-primary">Submit</button>
              </form>
            </div>
          )}
          {ifTrue(success, () =>
            <div>
              <h3>Request registered</h3>
              <p>If this address matches an existing account, you should soon receive an email with a password recovery link.</p>
              <p>If you have issues finding the email, check your spam folder. Still out of luck?
                Please <a href="/article/about">contact an administrator</a>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
