
/**
 * Manipulate global settings
 */

export type EditableSettingCategory = "events" | "home page" | "docs";

export interface EditableSetting {
  key: string;
  category: EditableSettingCategory;
  description: string;
  isJson?: boolean;
  isMarkdown?: boolean;
  isAdminOnly?: boolean;
}

export const SETTING_FEATURED_EVENT_NAME = "featured_event_name";
export const SETTING_FEATURED_POST_ID = "featured_post_id";
export const SETTING_FEATURED_TWITCH_CHANNEL = "featured_twitch_channel";
export const SETTING_HOME_TIMELINE_SIZE = "home_timeline_size";

export const SETTING_EVENT_REQUIRED_ENTRY_VOTES = "event_required_entry_votes";
export const SETTING_EVENT_THEME_IDEAS_REQUIRED = "event_theme_ideas_required";
export const SETTING_EVENT_THEME_ELIMINATION_MODULO = "event_theme_elimination_modulo";
export const SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES = "event_theme_elimination_min_notes";
export const SETTING_EVENT_THEME_ELIMINATION_THRESHOLD = "event_theme_elimination_threshold";
export const SETTING_EVENT_THEME_SHORTLIST_SIZE = "event_theme_shortlist_size";
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
    description: "(Optional) Set a post ID to pin an arbitrary blog post at the top of the front page. Mostly for emergencies."
  },
  {
    key: SETTING_FEATURED_TWITCH_CHANNEL,
    category: "home page",
    description: "(Optional) Set a Twitch channel name to pin it as an embed at the top of the front page. "
      + "For jam launches and other official streams."
  },
  {
    key: SETTING_HOME_TIMELINE_SIZE,
    category: "home page",
    description: "(Optional) Number of events to be shown in the timeline. Usually 5, but can be reduced to prevent overflow."
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
    description: "How many ratings an entry needs to get a ranking at the end of the jam. Actual requirement is 80% of that, rounded down."
  },
  {
    key: SETTING_EVENT_THEME_IDEAS_REQUIRED,
    category: "events",
    description: "How many themes must be submitted before theme voting starts."
  },
  {
    key: SETTING_EVENT_THEME_ELIMINATION_MODULO,
    category: "events",
    description: "Performance optimization setting: how many votes to wait before triggering theme eliminations again.",
    isAdminOnly: true
  },
  {
    key: SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES,
    category: "events",
    description: "How many votes must be cast before a theme can be eliminated."
  },
  {
    key: SETTING_EVENT_THEME_ELIMINATION_THRESHOLD,
    category: "events",
    description: "Between 0 and 1. Themes with an 'Elimination rating' below that point will be eliminated. Handle with care.",
    isAdminOnly: true
  },
  {
    key: SETTING_EVENT_THEME_SHORTLIST_SIZE,
    category: "events",
    description: "Number of themes to be kept the next time we compute a shortlist. Usually 10."
  },

  // Docs

  {
    key: SETTING_ARTICLE_SIDEBAR,
    category: "docs",
    description: "Contents of the 'Docs' and 'About' sidebars.",
    isJson: true
  },
];
