import * as React from 'preact';
import base from 'server/base.template';
import { collectHtml } from 'server/macros/nunjucks-macros';
import { peopleTabs } from 'server/macros/tabs.macros';
import { userThumb } from 'server/user/user.macros';
import { PeopleModsContext } from './people-mods.controller';

export default function render(context: PeopleModsContext) {
  const { admins, mods, path } = context;

  return base(context, <div class="container">
    {peopleTabs(path)}

    <div class="row spacing">
      <div class="col-12">
        <h2>Administrators</h2>
      </div>
    </div>
    <div class="row"
      dangerouslySetInnerHTML={ collectHtml(admins.map(userThumb)) }></div>

    <div class="row">
      <div class="col-12">
        <h2>Moderators</h2>
      </div>
    </div>
    <div class="row"
      dangerouslySetInnerHTML={ collectHtml(mods.map(userThumb)) }></div>
  </div>);

}
