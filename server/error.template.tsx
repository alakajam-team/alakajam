import * as React from "preact";
import base from "server/base.template";
import { CommonLocals } from "server/common.middleware";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";

export default function render(context: CommonLocals) {
  const { code, title, message, devMode, stack } = context;

  return base(context,
    <div class="container">
      <h1>{code}: {title || "Error"}</h1>

      <p>{message}</p>

      {ifTrue(devMode, () =>
        <div>
          {ifTrue(stack, () =>
            <div>
              <h2>Stack trace</h2>
              <pre>{stack}</pre>
            </div>
          )}
          {ifTrue(message && message.indexOf("no such column:") !== -1, () =>
            <div class="alert alert-warning">
              <h4>"No such column" error tip</h4>
              If you're not sure why you have this, your database model is probably out of date.
              You can reset the database from the <a href="/admin">administration</a>.
            </div>
          )}
        </div>
      )}

      {ifFalse(devMode, () =>
        <p>Please check the <a href="/article/about">About page</a> if you have a bug to report.</p>
      )}

      <p><a href="/">(Back)</a></p>
    </div>
  );
}
