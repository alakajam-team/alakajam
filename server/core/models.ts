/* eslint-disable prefer-rest-params */
/* eslint-disable no-underscore-dangle */

/**
 * Bookshelf models
 *
 * NB. To be deprecated/retired someday. The goal is to progressively migrate from Bookshelf to TypeORM.
 *
 * @module core/models
 */

import bookshelf from "./db";
import forms from "./forms";

// TODO Set up BaseModel to make code more concise

/**
 * Setting model
 *
 * | type | name | description
 * |--    |--    |--
 * | string | key | Primary key
 * | string | value | Setting value (max size: 10000)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const Setting = bookshelf.model("Setting", {
  tableName: "setting",
  idAttribute: "key",
  hasTimestamps: true,
  requireFetch: false
});

// ===============================================================
// USERS
// ===============================================================

/**
 * User model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | string | name | User name (must be unique, not null)
 * | string | title |
 * | string | email | (not null)
 * | string | avatar |
 * | string | is_mod |
 * | string | is_admin |
 * | string | password | (not null)
 * | string | password_salt | (not null)
 * | dateTime | notifications_last_read |
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 * | boolean | disallow_anonymous | Disallow this user to post anonymous comments
 */
export const User = bookshelf.model("User", {
  tableName: "user",
  idAttribute: "id",
  hasTimestamps: true,
  requireFetch: false,

  details() {
    return this.hasOne("UserDetails", "user_id");
  },
  roles() {
    return this.hasMany("UserRole", "user_id");
  },
  posts() {
    return this.hasMany("Post", "author_user_id");
  },
  comments() {
    return this.hasMany("Comment", "user_id");
  },
  likes() {
    return this.hasMany("Like", "user_id");
  },
  entryScores() {
    return this.hasMany("EntryScore", "user_id");
  },
  tournamentScores() {
    return this.hasMany("TournamentScore", "user_id");
  },
  themeVotes() {
    return this.hasMany("ThemeVote", "user_id");
  },
}, {
  // Cascading
  dependents: ["details", "roles", "entryScores", "tournamentScores", "comments", "posts", "likes", "themeVotes"],
});

/**
 * User Details model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | user_id | User ID (must be unique)
 * | string | body | User bio (max size : 100000)
 * | string | social_links | Social links JSON `{website, twitter}` (max size : 1000)
 */
export const UserDetails = bookshelf.model("UserDetails", {
  tableName: "user_details",
  idAttribute: "id",

  // Relations

  user() {
    return this.belongsTo("User", "user_id");
  },

  // Listeners

  initialize: function initialize(attrs) {
    this.constructor.__super__.initialize.apply(this, arguments);
    attrs = attrs || {};
    attrs.social_links = attrs.social_links || {};
    return attrs;
  },
  parse: function parse(attrs) {
    if (attrs && attrs.social_links) { attrs.social_links = JSON.parse(attrs.social_links); }
    return attrs;
  },
  format: function format(attrs) {
    if (attrs && attrs.social_links) { attrs.social_links = JSON.stringify(attrs.social_links); }
    return attrs;
  },
});

/**
 * User Role model
 *
 * | type | name | description
 * |--    |--    |--
 * | integer (increments) | id | Primary key
 * | integer | user_id | User ID (not null)
 * | string | user_name | Local copy of the user name (not null)
 * | string | user_title | Local copy of the user title
 * | integer | node_id | ID of the target node (not null)
 * | string | node_type | Type of the target node ('entry' or 'post', not null)
 * | string | permission | Permission: 'read', 'write', 'manage' (not null)
 * | integer | event_id | Event ID
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const UserRole = bookshelf.model("UserRole", {
  tableName: "user_role",
  idAttribute: "id",
  hasTimestamps: true,
  requireFetch: false,

  user() {
    return this.belongsTo("User", "user_id");
  },
  node() {
    return this.morphTo("node", ["node_type", "node_id"], "Entry", "Post");
  },
});

// ===============================================================
// EVENTS
// ===============================================================

/**
 * Event model
 *
 * | type | name | description
 * |--    |--    |--
 * | integer | id | ID
 * | string | name | Name (used in the URL, not null). Must have a hyphen to prevent clashing other root URLs.
 * | string | title | Title (not null)
 * | string | display_dates | The event dates, for display only
 * | string | display_theme | The event theme, for display only
 * | string | logo | Path to a logo picture
 * | string | event_preset_id | Currently used state preset
 * | string | status | General status: 'pending', 'open' or 'closed' (not null)
 * | string | status_rules | Event rules status: 'off', or a post ID, or an URL (not null)
 * | string | status_theme | Theme voting status: 'disabled', 'off', 'voting', 'shortlist', 'closed', 'results', or a post ID (not null)
 * | string | status_entry | Entry submission status: 'off', 'open', 'open_unranked' or 'closed' (not null)
 * | string | status_results | Event results status: 'disabled', 'off', 'voting', 'voting_rescue', results', or a post ID (not null)
 * | string | status_tournament | Event tournament status: 'disabled', 'off', 'submission', 'playing', 'closed', 'results'
 * | string | coutdown_config | Home page countdown JSON: `{date, phrase, enabled}`
 * | string | divisions | Divisions info: `{"name": "description"}`
 * | integer | entry_count | Total number of entries (if a jam) or entrants (if a tournament) in the event.
 * | date | started_at | Event start date, for sorting purposes
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const Event = bookshelf.model("Event", {
  tableName: "event",
  idAttribute: "id",
  hasTimestamps: true,
  requireFetch: false,

  // Relations

  details() {
    return this.hasOne("EventDetails", "event_id");
  },
  entries() {
    return this.hasMany("Entry", "event_id");
  },
  tournamentEntries() {
    return this.hasMany("TournamentEntry", "event_id");
  },
  preset() {
    return this.hasOne("EventPreset", "event_preset_id");
  },

  // Listeners

  initialize: function initialize(attrs) {
    this.constructor.__super__.initialize.apply(this, arguments);
    attrs = attrs || {};
    attrs.countdown_config = attrs.countdown_config || {};
    attrs.cron_config = attrs.cron_config || {};
    attrs.divisions = attrs.divisions || {};
    return attrs;
  },
  parse: function parse(attrs) {
    if (attrs) {
      if (attrs.countdown_config) { attrs.countdown_config = JSON.parse(attrs.countdown_config); }
      if (attrs.cron_config) { attrs.cron_config = JSON.parse(attrs.cron_config); }
      if (attrs.divisions) { attrs.divisions = JSON.parse(attrs.divisions); }
    }
    return attrs;
  },
  format: function format(attrs) {
    if (attrs) {
      if (attrs.countdown_config) { attrs.countdown_config = JSON.stringify(attrs.countdown_config); }
      if (attrs.cron_config) { attrs.cron_config = JSON.stringify(attrs.cron_config); }
      if (attrs.divisions) { attrs.divisions = JSON.stringify(attrs.divisions); }
    }
    return attrs;
  },
}, {
  // Cascading
  dependents: ["details", "entries"],
});

/**
 * Event Details model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | event_id | Event ID (not null)
 * | string | category_titles | Category names (JSON: [name])
 * | integer | theme_count | Number of theme ideas submitted
 * | integer | active_theme_count | Number of active themes
 * | integer | theme_vote_count | Number of theme votes
 * | string | banner | Path to a banner picture
 * | string | division_counts | Number of entries by division: {"name": count...}
 * | string | shortlist_elimination | Config for shortlist eliminations phase (JSON: {"start": date, "delay": number in minutes, "body": html}
 * | string | links | Config for a list of special pages to link to: (JSON: [{"title": string, "link": string, "icon": string}]
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const EventDetails = bookshelf.model("EventDetails", {
  tableName: "event_details",
  idAttribute: "id",
  hasTimestamps: true,
  requireFetch: false,

  // Relations

  event() {
    return this.belongsTo("Event", "event_id");
  },

  // Listeners

  initialize: function initialize(attrs) {
    this.constructor.__super__.initialize.apply(this, arguments);
    attrs = attrs || {};
    attrs.category_titles = attrs.category_titles || [];
    attrs.division_counts = attrs.division_counts || [];
    attrs.shortlist_elimination = attrs.shortlist_elimination || {};
    attrs.links = attrs.links || {};
    return attrs;
  },
  parse: function parse(attrs) {
    if (attrs) {
      if (attrs.category_titles) { attrs.category_titles = JSON.parse(attrs.category_titles); }
      if (attrs.division_counts) { attrs.division_counts = JSON.parse(attrs.division_counts); }
      if (attrs.shortlist_elimination) { attrs.shortlist_elimination = JSON.parse(attrs.shortlist_elimination); }
      if (attrs.links) { attrs.links = JSON.parse(attrs.links); }
    }
    return attrs;
  },
  format: function format(attrs) {
    if (attrs) {
      if (attrs.category_titles) { attrs.category_titles = JSON.stringify(attrs.category_titles); }
      if (attrs.division_counts) { attrs.division_counts = JSON.stringify(attrs.division_counts); }
      if (attrs.shortlist_elimination) { attrs.shortlist_elimination = JSON.stringify(attrs.shortlist_elimination); }
      if (attrs.links) { attrs.links = JSON.stringify(attrs.links); }
    }
    return attrs;
  },
});

/**
 * Event preset model
 *
 * | type | name | description
 * |--    |--    |--
 * | integer | id | ID
 * | string | title | Title (not null)
 * | string | status | General status (see Event)
 * | string | status_rules | Event rules status (see Event)
 * | string | status_theme | Theme voting status (see Event)
 * | string | status_entry | Entry submission status (see Event)
 * | string | status_results | Event results status (see Event)
 * | string | status_tournament | Event tournament status (see Event)
 * | string | coutdown_config | Home page countdown JSON (see Event)
 */
export const EventPreset = bookshelf.model("EventPreset", {
  tableName: "event_preset",
  idAttribute: "id",

  // Relations

  events() {
    return this.hasMany("Event", "event_preset_id");
  },

  // Listeners

  initialize: function initialize(attrs) {
    this.constructor.__super__.initialize.apply(this, arguments);
    attrs = attrs || {};
    attrs.countdown_config = attrs.countdown_config || {};
    return attrs;
  },
  parse: function parse(attrs) {
    if (attrs && attrs.countdown_config) { attrs.countdown_config = JSON.parse(attrs.countdown_config); }
    return attrs;
  },
  format: function format(attrs) {
    if (attrs && attrs.countdown_config) { attrs.countdown_config = JSON.stringify(attrs.countdown_config); }
    return attrs;
  },
});

/**
 * Event template model
 *
 * | type | name | description
 * |--    |--    |--
 * | integer | id | ID
 * | string | title | Title (not null)
 * | string | event_title | Default event title (not null)
 * | integer | event_preset_id | Default event preset
 * | string | links | Default spacial pages (see EventDetails)
 * | string | divisions | Default divisions info (see Event)
 * | string | category_titles | Default category names (see EventDetails)
 */
export const EventTemplate = bookshelf.model("EventTemplate", {
  tableName: "event_template",
  idAttribute: "id",

  // Relations

  preset() {
    return this.hasOne("EventPreset", "event_preset_id");
  },

  // Listeners

  initialize: function initialize(attrs) {
    this.constructor.__super__.initialize.apply(this, arguments);
    attrs = attrs || {};
    attrs.links = attrs.links || [];
    attrs.divisions = attrs.divisions || {};
    attrs.category_titles = attrs.category_titles || [];
    return attrs;
  },
  parse: function parse(attrs) {
    if (attrs) {
      if (attrs.links) { attrs.links = JSON.parse(attrs.links); }
      if (attrs.divisions) { attrs.divisions = JSON.parse(attrs.divisions); }
      if (attrs.category_titles) { attrs.category_titles = JSON.parse(attrs.category_titles); }
    }
    return attrs;
  },
  format: function format(attrs) {
    if (attrs) {
      if (attrs.links) { attrs.links = JSON.stringify(attrs.links); }
      if (attrs.divisions) { attrs.divisions = JSON.stringify(attrs.divisions); }
      if (attrs.category_titles) { attrs.category_titles = JSON.stringify(attrs.category_titles); }
    }
    return attrs;
  },
});

/**
 * Entry model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | event_id | Event ID (can be null in case of an external entry)
 * | string | event_name | Name (used in the URL, can be null in case of an external entry)
 * | string | external_event | External event title (if not an Alakajam! game, ie. event_id is null)
 * | string | name | (not null)
 * | string | title | (not null)
 * | string | description | (max size: 2000)
 * | string | links | JSON Array : [{url, title}]
 * | string | platforms | JSON Array : [platform]
 * | string | pictures | JSON Array : [path]
 * | string | division | "solo"/"team"/"unranked" (not null)
 * | decimal | karma | ([-999.999;999.999], defaults to 100, not null)
 * | dateTime | published_at |
 * | integer | comment_count | (not null)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 * | boolean | allow_anonymous | Are anonymous comments allowed on this entry?
 * | string | status_high_score | High score enablement status ('off', 'normal', 'reversed')
 * | decimal | hotness | ([-999.99999;999.99999], the higher the hotter)
 */
export const Entry = bookshelf.model("Entry", {
  tableName: "entry",
  idAttribute: "id",
  hasTimestamps: true,
  requireFetch: false,

  // Relations

  details() {
    return this.hasOne("EntryDetails", "entry_id");
  },
  event() {
    return this.belongsTo("Event", "event_id");
  },
  userRoles() {
    return this.morphMany("UserRole", "node", ["node_type", "node_id"]);
  },
  comments() {
    return this.morphMany("Comment", "node", ["node_type", "node_id"]);
  },
  entryPlatforms() {
    return this.hasMany("EntryPlatform", "entry_id");
  },
  votes() {
    return this.hasMany("EntryVote", "entry_id");
  },
  invites() {
    return this.hasMany("EntryInvite", "entry_id");
  },
  tags() {
    return this.belongsToMany("Tag", "entry_tag", "entry_id", "tag_id");
  },
  posts() {
    return this.hasMany("Post", "entry_id");
  },
  scores() {
    return this.hasMany("EntryScore", "entry_id");
  },

  // Listeners

  initialize: function initialize(attrs) {
    this.constructor.__super__.initialize.apply(this, arguments);
    this.on("saving", (model) => {
      model.set("name", forms.slug(model.get("title") || "").toLowerCase() || "unnamed");
    });
    attrs = attrs || {};
    attrs.links = attrs.links || [];
    attrs.pictures = attrs.pictures || [];
    attrs.platforms = attrs.platforms || [];
    return attrs;
  },
  parse: function parse(attrs) {
    if (attrs) {
      if (attrs.links) { attrs.links = JSON.parse(attrs.links); }
      if (attrs.pictures) { attrs.pictures = JSON.parse(attrs.pictures); }
      if (attrs.platforms) { attrs.platforms = JSON.parse(attrs.platforms); }
    }
    return attrs;
  },
  format: function format(attrs) {
    if (attrs) {
      if (attrs.links) { attrs.links = JSON.stringify(attrs.links); }
      if (attrs.pictures) { attrs.pictures = JSON.stringify(attrs.pictures); }
      if (attrs.platforms) { attrs.platforms = JSON.stringify(attrs.platforms); }
    }
    return attrs;
  },

  // Helpers

  sortedUserRoles() {
    return this.related("userRoles").sortBy((userRole) => {
      // List owners first, otherwise sort alphabetically
      if (userRole.get("permission") === "manage") {
        return " " + userRole.get("user_title");
      } else {
        return userRole.get("user_title");
      }
    });
  },
  picturePreviews() {
    if (this.has("pictures") && this.get("pictures").previews) {
      return this.get("pictures").previews;
    } else {
      return [];
    }
  },
  pictureThumbnail() {
    if (this.has("pictures")) {
      return this.get("pictures").thumbnail;
    } else {
      return undefined;
    }
  },
  pictureIcon() {
    if (this.has("pictures")) {
      return this.get("pictures").icon;
    } else {
      return undefined;
    }
  },

}, {
  // Cascading
  dependents: ["details", "entryPlatforms", "votes", "invites", "tags", "scores"], // 'comments', 'userRoles' removed because of issue #93
});

/**
 * Entry Details model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Entry ID (not null)
 * | string | body | Detailed description (max size: 100000)
 * | string | optouts | Opted-out categories (JSON: [category_title])
 * | decimal | rating_1 .. 6 | Rating for categories 1 to 6 ([-99.999,99.999])
 * | integer | ranking_1 .. 6 | Ranking for categories 1 to 6 (max: 100000)
 * | integer | rating_count | Received rating count
 * | integer | high_score_count | Submitted scores count
 * | integer | high_score_type | 'number', 'time' or any custom text to be used as a suffix (max size: 20)
 * | integer | high_score_instructions | Markdown text to be shown when submitting a score (max size: 200
 * | boolean | allow_tournament_use | Whether the authors allow using the game for tournaments0)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const EntryDetails = bookshelf.model("EntryDetails", {
  tableName: "entry_details",
  idAttribute: "id",
  hasTimestamps: true,
  requireFetch: false,

  entry() {
    return this.belongsTo("Entry", "entry_id");
  },

  // Listeners

  initialize: function initialize(attrs) {
    this.constructor.__super__.initialize.apply(this, arguments);
    attrs = attrs || {};
    attrs.optouts = attrs.optouts || [];
    return attrs;
  },
  parse: function parse(attrs) {
    if (attrs && attrs.optouts) { attrs.optouts = JSON.parse(attrs.optouts); }
    return attrs;
  },
  format: function format(attrs) {
    if (attrs && attrs.optouts) { attrs.optouts = JSON.stringify(attrs.optouts); }
    return attrs;
  },

});

/**
 * Platform model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | string | name | Platform name
 */
export const Platform = bookshelf.model("Platform", {
  tableName: "platform",
  idAttribute: "id",
});

/**
 * Entry Platform model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Entry ID (not null)
 * | string | platform_name | Platform name (max size: 50)
 */
export const EntryPlatform = bookshelf.model("EntryPlatform", {
  tableName: "entry_platform",
  idAttribute: "id",

  entry() {
    return this.belongsTo("Entry", "entry_id");
  },
  platform() {
    return this.belongsTo("Platform", "platform_id");
  },

  // Listeners

  initialize: function initialize(attrs) {
    this.constructor.__super__.initialize.apply(this, arguments);
    attrs = attrs || {};
    return attrs;
  },
});

/**
 * Tag model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | value | Tag label
 */
export const Tag = bookshelf.model("Tag", {
  tableName: "tag",
  idAttribute: "id",

  entries() {
    return this.belongsToMany("Entry", "entry_tag", "tag_id", "entry_id");
  },
  entryJoins() {
    return this.hasMany("EntryTag", "tag_id");
  },
}, {
  // Cascading
  dependents: ["entryJoins"],
});

export const EntryTag = bookshelf.model("EntryTag", {
  tableName: "entry_tag",
});

/**
 * Entry Vote model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Entry ID (not null)
 * | integer | event_id | Event ID (not null)
 * | integer | user_id | User ID (not null)
 * | decimal | vote_1 .. 6 | Vote for categories 1 to 6 ([-999.99,999.99])
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const EntryVote = bookshelf.model("EntryVote", {
  tableName: "entry_vote",
  idAttribute: "id",
  hasTimestamps: true,
  requireFetch: false,

  entry() {
    return this.belongsTo("Entry", "entry_id");
  },
  event() {
    return this.belongsTo("Event", "event_id");
  },
  user() {
    return this.belongsTo("User", "user_id");
  },
});

/**
 * Entry Invite model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | entry_id | Target entry ID (not null)
 * | integer | invited_user_id | User ID of the person invited (not null)
 * | integer | invited_user_title | User title of the person invited (not null)
 * | string | permission | The offered permission (not null)
 */
export const EntryInvite = bookshelf.model("EntryInvite", {
  tableName: "entry_invite",
  idAttribute: "id",
  hasTimestamps: true,
  requireFetch: false,

  entry() {
    return this.belongsTo("Entry", "entry_id");
  },
  invited() {
    return this.belongsTo("User", "invited_user_id");
  },
});

// ===============================================================
// THEMES
// ===============================================================

/**
 * Theme model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | event_id | Event ID (not null)
 * | integer | user_id | User ID (not null)
 * | string | title | (max size: 100, not null)
 * | string | slug | Used for detecting duplicate themes (not null)
 * | integer | score | (defaults to 0, not null)
 * | decimal | normalized_score | (defaults to 0, not null, [-9.999;9.999])
 * | decimal | ranking | rough ranking in percentage ([-9.999;9.999])
 * | decimal | rating_elimination | lowest scores are eliminated or will soon ([-9.999;9.999])
 * | decimal | rating_shortlist | highest scores are to be chosen for the shortlist ([-9.999;9.999])
 * | integer | notes | total notes (defaults to 0, not null)
 * | integer | reports | total reports (defaults to 0, not null)
 * | string | status | 'active', 'out', 'banned', 'shortlist' (not null)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const Theme = bookshelf.model("Theme", {
  tableName: "theme",
  idAttribute: "id",
  hasTimestamps: true,
  requireFetch: false,

  // Relations

  event() {
    return this.belongsTo("Event", "event_id");
  },
  user() {
    return this.belongsTo("User", "user_id");
  },
  votes() {
    return this.hasMany("ThemeVote", "theme_id");
  },

}, {
  // Cascading
  dependents: ["votes"],
});

/**
 * Theme Vote model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | theme_id | Theme ID (not null)
 * | integer | event_id | Event ID (not null)
 * | integer | user_id | User ID (not null)
 * | integer | score | (not null)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const ThemeVote = bookshelf.model("ThemeVote", {
  tableName: "theme_vote",
  idAttribute: "id",
  hasTimestamps: true,
  requireFetch: false,

  // Relations

  theme() {
    return this.belongsTo("Theme", "theme_id");
  },
  event() {
    return this.belongsTo("Event", "event_id");
  },
  user() {
    return this.belongsTo("User", "user_id");
  },
});

// ===============================================================
// HIGH SCORES / TOURNAMENTS
// ===============================================================

/**
 * Entry score model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | user_id | User ID (not null)
 * | integer | entry_id | Entry ID (not null)
 * | decimal | score | Score ([-999.999.999.999,999;999.999.999.999,999], not null)
 * | string | proof | URL of the proof picture or video
 * | integer | ranking | User ranking on that entry
 * | date | submitted_at | Submission time (not null)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const EntryScore = bookshelf.model("EntryScore", {
  tableName: "entry_score",
  hasTimestamps: true,
  requireFetch: false,

  // Relations

  user() {
    return this.belongsTo("User", "user_id");
  },
  entry() {
    return this.belongsTo("Entry", "entry_id");
  },
});

/**
 * Tournament entry model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | event_id | Tournament event ID (not null)
 * | integer | entry_id | Entry ID (not null)
 * | integer | ordering | Entry order
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const TournamentEntry = bookshelf.model("TournamentEntry", {
  tableName: "tournament_entry",
  hasTimestamps: true,
  requireFetch: false,

  // Relations

  entry() {
    return this.belongsTo("Entry", "entry_id");
  },
  event() {
    return this.belongsTo("Event", "event_id");
  },
});

/**
 * Tournament score model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | user_id | User ID (not null)
 * | integer | event_id | Tournament event ID (not null)
 * | decimal | score | Score ([-999.999.999.999,999;999.999.999.999,999], not null)
 * | string | entry_scores | JSON caching of the entry scores used to compute the tournament score: {entryId: {score, ranking}}
 * | integer | ranking | User ranking on that tournament
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const TournamentScore = bookshelf.model("TournamentScore", {
  tableName: "tournament_score",
  hasTimestamps: true,
  requireFetch: false,

  // Listeners

  initialize: function initialize(attrs) {
    this.constructor.__super__.initialize.apply(this, arguments);
    attrs = attrs || {};
    attrs.entry_scores = attrs.entry_scores || {};
    return attrs;
  },
  parse: function parse(attrs) {
    if (attrs && attrs.entry_scores) { attrs.entry_scores = JSON.parse(attrs.entry_scores); }
    return attrs;
  },
  format: function format(attrs) {
    if (attrs && attrs.entry_scores) { attrs.entry_scores = JSON.stringify(attrs.entry_scores); }
    return attrs;
  },

  // Relations

  user() {
    return this.belongsTo("User", "user_id");
  },
  event() {
    return this.belongsTo("Event", "event_id");
  },
});

// ===============================================================
// POSTS
// ===============================================================

/**
 * Post model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | author_user_id | Author user ID (not null)
 * | string | name | Name (used in the URL, not null)
 * | string | title | Title (not null)
 * | integer | entry_id | Entry ID
 * | integer | event_id | Event ID
 * | string | body | Post body (max size: 100000)
 * | string | special_post_type | 'announcement' or empty
 * | integer | comment_count | Number of comments made on this post
 * | dateTime | published_at | Publication time
 * | integer | like_count | Number of likes of any type on this post
 * | string | like_details | JSON array: {type: count}
 * | decimal | hotness | ([-999.99999;999.99999], the higher the hotter)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const Post = bookshelf.model("Post", {
  tableName: "post",
  hasTimestamps: true,
  requireFetch: false,

  // Listeners

  initialize: function initialize(attrs) {
    this.constructor.__super__.initialize.apply(this, arguments);

    this.on("saving", () => {
      this.trigger("titleChanged");
    });
    this.on("titleChanged", function() {
      this.set("name", forms.slug(this.get("title") || "").toLowerCase());
    });

    attrs = attrs || {};
    attrs.like_details = attrs.like_details || {};
    return attrs;
  },
  parse: function parse(attrs) {
    if (attrs && attrs.like_details) { attrs.like_details = JSON.parse(attrs.like_details); }
    return attrs;
  },
  format: function format(attrs) {
    if (attrs && attrs.like_details) { attrs.like_details = JSON.stringify(attrs.like_details); }
    return attrs;
  },

  // Relations

  entry() {
    return this.belongsTo("Entry", "entry_id");
  },
  event() {
    return this.belongsTo("Event", "event_id");
  },
  author() {
    return this.belongsTo("User", "author_user_id");
  },
  userRoles() {
    // TODO isn't it sufficient to specify either 'node' or ['node_type', 'node_id']?
    return this.morphMany("UserRole", "node", ["node_type", "node_id"]);
  },
  comments() {
    return this.morphMany("Comment", "node", ["node_type", "node_id"]);
  },
  likes() {
    return this.morphMany("Like", "node", ["node_type", "node_id"]);
  }
}, {
  // Cascading
  dependents: ["likes"], // 'comments', 'userRoles' removed because of issue #93
});

/**
 * Comment model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | node_id | ID of the target node (not null)
 * | string | node_type | Type of the target node ('entry' or 'post', not null)
 * | integer | user_id | Author user ID (not null)
 * | integer | parent_id | Parent comment ID
 * | string | body | Comment body (max size: 10000)
 * | integer | karma | Karma gained through this comment (between 1 & 3, not null)
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const Comment = bookshelf.model("Comment", {
  tableName: "comment",
  hasTimestamps: true,
  requireFetch: false,

  // Relations

  node() {
    return this.morphTo("node", ["node_type", "node_id"], "Entry", "Post");
  },
  user() {
    return this.belongsTo("User", "user_id", "id");
  },
  parentComment() {
    return this.belongsTo("Comment", "parent_id", "id");
  },

  // Methods

  /**
   * Tells whether a model has been edited > 1 hour after its creation
   * @param  {Model} model Any model with timestamps
   * @return {bool}
   */
  wasEdited(): boolean {
    return this.get("updated_at") - this.get("created_at") > 3600 * 1000;
  }

});

/**
 * Like model
 *
 * | type | name | description
 * |--    |--    |--
 * | increments | id | Primary key
 * | integer | node_id | ID of the target node (not null)
 * | string | node_type | Type of the target node ('entry' or 'post', not null)
 * | integer | user_id | Author user ID (not null)
 * | integer | type | Like type
 * | date | created_at | Creation time (not null)
 * | date | modified_at | Last modification time (not null)
 */
export const Like = bookshelf.model("Like", {
  tableName: "like",
  hasTimestamps: true,
  requireFetch: false,

  // Relations

  node() {
    return this.morphTo("node", ["node_type", "node_id"], "Post");
  },
  user() {
    return this.belongsTo("User", "user_id", "id");
  },
});
