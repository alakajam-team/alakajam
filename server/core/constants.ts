/**
 * Constants
 *
 * @module core/constants
 */

import { sync as findUp } from "find-up";
import * as path from "path";
import config from "./config";

const ROOT_PATH = path.dirname(findUp("package.json", { cwd: __dirname }));

const PERMISSION_READ = "read";
const PERMISSION_WATCH = "watch";
const PERMISSION_WRITE = "write";
const PERMISSION_MANAGE = "manage";
const ORDERED_PERMISSIONS = [PERMISSION_READ, PERMISSION_WATCH, PERMISSION_WRITE, PERMISSION_MANAGE];

const SPECIAL_POST_TYPE_ANNOUNCEMENT = "announcement";
const SPECIAL_POST_TYPE_HIDDEN = "hidden";
const SPECIAL_POST_TYPES = [SPECIAL_POST_TYPE_ANNOUNCEMENT, SPECIAL_POST_TYPE_HIDDEN];

const SETTING_FEATURED_EVENT_NAME = "featured_event_name";
const SETTING_FEATURED_POST_ID = "featured_post_id";
const SETTING_ARTICLE_SIDEBAR = "article_sidebar";
const SETTING_SESSION_KEY = "session_key";
const SETTING_SESSION_SECRET = "session_secret";
const SETTING_INVITE_PASSWORD = "invite_password";
const SETTING_INVITE_PEPPER = "invite_pepper";
const SETTING_EVENT_REQUIRED_ENTRY_VOTES = "event_required_entry_votes";
const SETTING_EVENT_THEME_IDEAS_REQUIRED = "event_theme_ideas_required";
const SETTING_EVENT_THEME_ELIMINATION_MODULO = "event_theme_elimination_modulo";
const SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES = "event_theme_elimination_min_notes";
const SETTING_EVENT_THEME_ELIMINATION_THRESHOLD = "event_theme_elimination_threshold";
const SETTING_EVENT_THEME_SUGGESTIONS = "event_theme_suggestions";
const SETTING_EVENT_OPEN_VOTING = "event_open_voting";
const SETTING_HOME_SHRINKED_JUMBO = "home_shrinked_jumbo";

export default {
  // Paths
  ROOT_PATH,
  UPLOADS_WEB_PATH: "/data/uploads/",

  // Settings
  SETTING_FEATURED_EVENT_NAME,
  SETTING_FEATURED_POST_ID,
  SETTING_ARTICLE_SIDEBAR,
  SETTING_SESSION_KEY,
  SETTING_SESSION_SECRET,
  SETTING_INVITE_PASSWORD,
  SETTING_INVITE_PEPPER,
  SETTING_EVENT_REQUIRED_ENTRY_VOTES,
  SETTING_EVENT_THEME_IDEAS_REQUIRED,
  SETTING_EVENT_THEME_ELIMINATION_MODULO,
  SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES,
  SETTING_EVENT_THEME_ELIMINATION_THRESHOLD,
  SETTING_EVENT_THEME_SUGGESTIONS,
  SETTING_EVENT_OPEN_VOTING,
  SETTING_HOME_SHRINKED_JUMBO,
  EDITABLE_SETTINGS: [
    SETTING_FEATURED_EVENT_NAME, SETTING_FEATURED_POST_ID, SETTING_ARTICLE_SIDEBAR, SETTING_EVENT_REQUIRED_ENTRY_VOTES,
    SETTING_EVENT_THEME_IDEAS_REQUIRED, SETTING_EVENT_THEME_ELIMINATION_MODULO,
    SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, SETTING_EVENT_THEME_ELIMINATION_THRESHOLD,
    SETTING_EVENT_THEME_SUGGESTIONS, SETTING_EVENT_OPEN_VOTING, SETTING_HOME_SHRINKED_JUMBO],
  JSON_EDIT_SETTINGS: [SETTING_ARTICLE_SIDEBAR],

  // Sessions
  REMEMBER_ME_MAX_AGE: 30 * 24 * 3600000 /* 30 days */,

  // User accounts
  USERNAME_VALIDATION_REGEX: /^[a-zA-Z][-\w]+$/g,
  USERNAME_MIN_LENGTH: 3,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_RECOVERY_LINK_MAX_AGE: 24 * 3600000, /* 1 day */

  // Security
  PERMISSION_READ,
  PERMISSION_WATCH,
  PERMISSION_WRITE,
  PERMISSION_MANAGE,
  ORDERED_PERMISSIONS,
  CONFIDENTIAL_CACHE_KEYS: [SETTING_SESSION_KEY],

  // Database
  DB_ILIKE: config.DB_TYPE.startsWith("sqlite") ? "LIKE" : "ILIKE",

  // Posts
  SPECIAL_POST_TYPE_ANNOUNCEMENT,
  SPECIAL_POST_TYPE_HIDDEN,
  SPECIAL_POST_TYPES,
  REQUIRED_ARTICLES: ["docs", "faq"],
  ALLOWED_POST_TAGS: [
    "b", "i", "em", "strong", "a", "u", "del", "code", "br", "hr", "iframe", "img", "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "blockquote", "pre", "ul", "ol", "li", "video", "source", "table", "thead", "tbody", "tr", "th", "td",
    "progress", "div",
  ],
  ALLOWED_POST_ATTRIBUTES: {
    div: ["class"],
    p: ["class"],
    a: ["href", "class", "name"],
    iframe: [
      "src", "width", "height", "class", "frameborder",
      "webkitallowfullscreen", "mozallowfullscreen", "allowfullscreen"
    ],
    img: ["src", "data-src", "width", "height", "class"],
    video: ["poster", "preload", "autoplay", "muted", "loop", "webkit-playsinline", "width", "height", "class"],
    source: ["src", "type"],
    progress: ["value", "max", "width"]
  },
  ALLOWED_POST_CLASSES: [
    "pull-left", "pull-right", "text-left", "text-center", "text-right",
    "spoiler", "indent", "btn", "btn-default", "btn-primary",
  ],
  ALLOWED_IFRAME_HOSTS: [
    "www.youtube-nocookie.com"
  ],
  ANONYMOUS_USER_ID: -1,

  // Dates
  ORDINAL_DAY_TOKEN: "#",
  DATE_FORMAT: "MMMM # yyyy",
  DATE_TIME_FORMAT: "MMMM # yyyy, h:mma",
  PICKER_DATE_TIME_FORMAT: "YYYY-MM-DD HH:mm",
  FEATURED_EVENT_DATE_FORMAT: "MMM. #, ha",

  // Entries
  ENTRY_PLATFORM_DEFAULT_ICON: "far fa-file",
  ENTRY_PLATFORM_ICONS: {
    Windows: "fab fa-windows",
    Linux: "fab fa-linux",
    Mac: "fab fa-apple",
    Web: "fas fa-globe",
    Mobile: "fas fa-mobile-alt",
    Retro: "fas fa-gamepad",
  },
  DIVISION_ICONS: {
    solo: "fas fa-user",
    team: "fas fa-users",
    ranked: "fas fa-flag-checkered",
    unranked: "fas fa-hat-wizard",
  },

  // Events
  MAX_CATEGORY_COUNT: 6,
  TOURNAMENT_POINTS_DISTRIBUTION: [15, 12, 10, 8, 6, 5, 4, 3, 2, 1],
  SHORTLIST_SIZE: 10,

  // Pictures
  PICTURE_OPTIONS_DEFAULT: { maxWidth: 1280, maxHeight: 720 },
  PICTURE_OPTIONS_THUMB: { maxWidth: 350, fit: "inside", suffix: "-thumb" },
  PICTURE_OPTIONS_THUMB_PORTRAIT: { maxWidth: 350, maxHeight: 180, fit: "contain", suffix: "-thumb" },
  PICTURE_OPTIONS_ICON: { maxWidth: 60, maxHeight: 60, fit: "cover", suffix: "-icon" },

  // Field size limits
  MAX_BODY_ANY: 100000,
  MAX_BODY_POST: 100000,
  MAX_BODY_USER_DETAILS: 100000,
  MAX_BODY_ENTRY_DETAILS: 100000,
  MAX_BODY_COMMENT: 10000,

  // Misc
  ARTICLES_ROOT_URL: "https://raw.githubusercontent.com/alakajam-team/alakajam/master/server/docs/article-data/",
  PAYPAL_BUTTON: `<form action="https://www.paypal.com/cgi-bin/webscr"
        method="post" target="_top" style="display: inline">
    <input type="hidden" name="cmd" value="_s-xclick" />
    <input type="hidden" name="hosted_button_id" value="M9V7Y5CNLP4EN" />
    <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif"
        border="0" name="submit" title="PayPal - The safer, easier way to pay online!"
        alt="Donate with PayPal button" />
    <img alt="" border="0" src="https://www.paypal.com/en_FR/i/scr/pixel.gif" width="1" height="1" />
    </form>`,

};
