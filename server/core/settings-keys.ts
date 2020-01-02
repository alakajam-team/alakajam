
/**
 * Manipulate global settings
 *
 * @module services/setting-service
 */

export type EditableSettingCategory = "events" | "home page" | "docs";

export interface EditableSetting {
  key: string;
  category: EditableSettingCategory;
  description: string;
  isJson?: boolean;
  isMarkdown?: boolean;
}

export const SETTING_FEATURED_EVENT_NAME = "featured_event_name";
export const SETTING_FEATURED_POST_ID = "featured_post_id";
export const SETTING_HOME_SHRINKED_JUMBO = "home_shrinked_jumbo";

export const SETTING_EVENT_REQUIRED_ENTRY_VOTES = "event_required_entry_votes";
export const SETTING_EVENT_THEME_IDEAS_REQUIRED = "event_theme_ideas_required";
export const SETTING_EVENT_THEME_ELIMINATION_MODULO = "event_theme_elimination_modulo";
export const SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES = "event_theme_elimination_min_notes";
export const SETTING_EVENT_THEME_ELIMINATION_THRESHOLD = "event_theme_elimination_threshold";
export const SETTING_EVENT_THEME_SUGGESTIONS = "event_theme_suggestions";
export const SETTING_EVENT_OPEN_VOTING = "event_open_voting";
export const SETTING_EVENT_TOURNAMENT_ADVERTISING = "event_tournament_advertising";

export const SETTING_ARTICLE_SIDEBAR = "article_sidebar";

export const SETTING_SESSION_KEY = "session_key";
export const SETTING_SESSION_SECRET = "session_secret";
export const SETTING_INVITE_PASSWORD = "invite_password";
export const SETTING_INVITE_PEPPER = "invite_pepper";

export const EDITABLE_SETTINGS_CATEGORIES: EditableSettingCategory[] = [
  "home page",
  "events",
  "docs"
];

export const EDITABLE_SETTINGS: EditableSetting[] = [

  // Home

  {
    key: SETTING_FEATURED_EVENT_NAME,
    category: "home page",
    description: "Sets which event is featured on the frontpage. Use the name of the event, as displayed in its URL."
  },
  {
    key: SETTING_FEATURED_POST_ID,
    category: "home page",
    description: "(Optional) Set a post ID to display an arbitrary blog post at the top of the front page. Rarely used."
  },
  {
    key: SETTING_HOME_SHRINKED_JUMBO,
    category: "home page",
    description: "Boolean. If true, makes the featured event jumbo smaller to give more visibility to the blog posts below."
  },

  // Events

  {
    key: SETTING_EVENT_OPEN_VOTING,
    category: "events",
    description: "Boolean. Whether anyone can rate games (even people who didn't enter the jam). Useful for small events."
  },
  {
    key: SETTING_EVENT_TOURNAMENT_ADVERTISING,
    category: "events",
    description: "Markdown. Displays the ad in the entry submit form, near the toggle to activate high scores.",
    isMarkdown: true
  },
  {
    key: SETTING_EVENT_THEME_SUGGESTIONS,
    category: "events",
    description: "How many themes each user can submit."
  },
  {
    key:  SETTING_EVENT_REQUIRED_ENTRY_VOTES,
    category: "events",
    description: "How many ratings an entry needs to get a ranking at the end of the jam."
  },
  {
    key: SETTING_EVENT_THEME_IDEAS_REQUIRED,
    category: "events",
    description: "How many themes must be submitted before theme voting starts."
  },
  {
    key: SETTING_EVENT_THEME_ELIMINATION_MODULO,
    category: "events",
    description: "Performance optimization setting: how many votes to wait before triggering theme eliminations again."
  },
  {
    key: SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES,
    category: "events",
    description: "How many votes must be cast before a theme can be eliminated."
  },
  {
    key: SETTING_EVENT_THEME_ELIMINATION_THRESHOLD,
    category: "events",
    description: "Between 0 and 1. Themes with an 'Elimination rating' below that point will be eliminated. Handle with care."
  },

  // Docs

  {
    key: SETTING_ARTICLE_SIDEBAR,
    category: "docs",
    description: "Contents of the 'Docs' and 'About' sidebars.",
    isJson: true
  },
];
