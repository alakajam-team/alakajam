import * as React from 'preact';
import { User } from 'server/entity/user.entity';
import { peopleTabs } from 'server/macros/tabs.macros';
import { userThumb } from 'server/user/user.macros';
import { CommonLocals } from 'server/common.middleware';
import base from 'server/base.template';
import { collectHtml, collectHtmlAsDiv } from 'server/macros/nunjucks-macros';

export interface PeopleModsContext extends CommonLocals {
  admins: User[];
  mods: User[];
}

export default function peopleModsTemplate(context: PeopleModsContext) {
  const { admins, mods } = context;

  return base(context, <div className="container">
    {peopleTabs()}

    <div className="row spacing">
      <div className="col-12">
        <h2>Administrators</h2>
      </div>
    </div>
    <div className="row"
      dangerouslySetInnerHTML={ collectHtml(admins.map(userThumb)) }></div>

    <div className="row">
      <div className="col-12">
        <h2>Moderators</h2>
      </div>
    </div>
    <div className="row"
      dangerouslySetInnerHTML={ collectHtml(mods.map(userThumb)) }></div>
  </div>);

}
