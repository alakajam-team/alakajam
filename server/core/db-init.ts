import { EntryBookshelfModel } from "bookshelf";
import * as luxon from "luxon";
import settings from "server/core/settings";
import { User } from "server/entity/user.entity";
import constants from "./constants";
import {
  createComment,
  createEntry,
  createEvent,
  createPlatforms,
  createPost,
  createUser,
  insertEntryVotes,
  submitThemes
} from "./db-seed-helpers";
import enums from "./enums";
import fileStorage from "./file-storage";
import { formatDate } from "./formats";
import log from "./log";
import {
  SETTING_ARTICLE_SIDEBAR,
  SETTING_EVENT_REQUIRED_ENTRY_VOTES,
  SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES,
  SETTING_EVENT_THEME_ELIMINATION_MODULO,
  SETTING_EVENT_THEME_IDEAS_REQUIRED,
  SETTING_FEATURED_EVENT_NAME
} from "./settings-keys";

/**
 * Inserts sample data in the database.
 * @param {bool|string} samples true to add samples, 'nightly' to add the special nighly post
 * @returns {void}
 */
export async function insertInitialData(samples: boolean | "nightly"): Promise<void> {
  // Mandatory admin account & important settings

  const adminUser = await createUser("administrator", { title: "Administrator", admin: true });

  await settings.save(SETTING_EVENT_REQUIRED_ENTRY_VOTES, 1);
  await settings.save(SETTING_EVENT_THEME_ELIMINATION_MODULO, 5);
  await settings.save(SETTING_EVENT_THEME_ELIMINATION_MIN_NOTES, 1);
  await settings.save(SETTING_EVENT_THEME_IDEAS_REQUIRED, 5);
  await settings.save(SETTING_ARTICLE_SIDEBAR, defaultArticleSidebar());

  // Samples

  if (samples) {
    log.info("Inserting samples (this can take a while)...");

    // Users

    const entrantUser = await createUser("entrant", { title: "Entrant", bio: "I am definitely **not** a robot." });

    // 1st event

    const event1 = await createEvent({
      title: "1st Alakajam",
      name: "1st-alakajam",
      status: enums.EVENT.STATUS.CLOSED,
      display_dates: "Novembary 17 - 20, 2016",
      display_theme: "Make a website",
      status_theme: enums.EVENT.STATUS_THEME.DISABLED,
      status_entry: enums.EVENT.STATUS_ENTRY.OFF,
      status_results: enums.EVENT.STATUS_RESULTS.DISABLED,
    });
    await createEntry(entrantUser, { title: "Old Game", event: event1, unpublished: true });

    // 2nd event

    const event2 = await createEvent({
      title: "2nd Alakajam",
      name: "2nd-alakajam",
      status: enums.EVENT.STATUS.OPEN,
      display_dates: "Januember 29 - 31, 2017",
      display_theme: "You are not alone",
      status_theme: enums.EVENT.STATUS_THEME.VOTING,
      status_entry: enums.EVENT.STATUS_ENTRY.OPEN,
      status_results: enums.EVENT.STATUS_RESULTS.VOTING,
      countdown_config: {
        phrase: "starts",
        date: luxon.DateTime.local().plus({ days: 1 }).toJSDate(),
        enabled: false,
      },
    }, {
      category_titles: ["Overall", "Graphics", "Audio", "Gameplay", "Originality", "Theme"],
    });

    await settings.save(SETTING_FEATURED_EVENT_NAME, "2nd-alakajam");

    await submitThemes(entrantUser, event2, ["Alone", "Evolution", "Two buttons"]);

    await createEntry(adminUser, { title: "Super Game", event: event2, unpublished: true });
    const userEntry = await createEntry(entrantUser, { title: "Game 1", event: event2 });

    const otherEntrants: Array<{ user: User; entry: EntryBookshelfModel }> = [];
    for (let i = 2; i <= 10; i++) {
      const user = await createUser("entrant" + i);
      otherEntrants.push({ user, entry: await createEntry(user, { title: "Game " + i, event: event2 }) });
    }
    await insertEntryVotes(event2, randomVotes(otherEntrants));

    await createPost(entrantUser, {
      title: "I'm in!",
      body: "This is my second game and I'm really excited.",
      event: event2,
      entry: userEntry,
    });

    const announcement = (samples === "nightly") ? {
      title: "Nightly: " + formatDate(Date.now(), undefined, constants.DATE_FORMAT),
      body: (await fileStorage.read("deployment/NIGHTLY_POST.md")).toString(),
    } : {
      title: "Event started!",
      body: "The theme is `You are not alone`. Have fun!",
    };
    const post = await createPost(adminUser, {
      ...announcement,
      event: event2,
      specialPostType: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT,
    });
    event2.set("status_rules", post.get("id"));
    await event2.save();

    await createComment(entrantUser, post, "I'm in!");

    // Planned 3rd event

    await createEvent({
      title: "3rd Alakajam",
      name: "3rd-alakajam",
      status: enums.EVENT.STATUS.PENDING,
      display_dates: "Marchpril 5 - 8, 2017",
      status_theme: enums.EVENT.STATUS_THEME.OFF,
      status_entry: enums.EVENT.STATUS_ENTRY.OFF,
      status_results: enums.EVENT.STATUS_RESULTS.OFF,
    });

    // Platforms

    await createPlatforms(["Linux", "Mac", "Windows", "Web", "Mobile", "Retro"]);

    log.info("Samples inserted");
  }
}

/**
 * Makes each entrant rate the entries of the next 10 entrants (looping), with random ratings.
 */
function randomVotes(entrants: Array<{ user: User; entry: EntryBookshelfModel }>) {
  const votes = new Map<string, { user: User; entry: EntryBookshelfModel; ratings: number[] }>();
  entrants.forEach(({ user }, i) => {
    for (let j = 1; j <= 10; j++) {
      const { entry } = entrants[Math.max(0, (i + j + 2) % 11 - 2)];
      const ratings = [1, 2, 3, 4, 5, 6].map(() => 3 + Math.floor(Math.random() * 4));
      votes.set(user.id + "_" + entry.get("id"), { user, entry, ratings });
    }
  });
  return [...votes.values()];
}

function defaultArticleSidebar() {
  return `{
    "about": [
        {
            "title": "General",
            "links": [
                {
                    "title": "Welcome",
                    "url": "/article/about/welcome"
                },
                {
                    "title": "Press kit",
                    "url": "/article/about/press-kit"
                },
                {
                    "title": "Contributing",
                    "url": "/article/about/contributing"
                },
                {
                    "title": "Privacy policy",
                    "url": "/article/about/privacy-policy"
                }
            ]
        },
        {
            "title": "Behind the scenes",
            "links": [
                {
                    "title": "NPO constitution",
                    "url": "/article/about/npo-constitution"
                }
            ]
        }
    ],
    "docs": [
      {
          "title": "Game jam tips",
          "links": [
              {
                  "title": "Game making resources",
                  "url": "/article/docs/resources"
              },
              {
                  "title": "Managing scope",
                  "url": "/article/docs/gjt-scope"
              },
              {
                  "title": "Skills",
                  "url": "/article/docs/gjt-skills"
              },
              {
                  "title": "Social media",
                  "url": "/article/docs/gjt-social"
              },
              {
                  "title": "Timelapses",
                  "url": "/article/docs/gjt-timelapses"
              },
              {
                "title": "Practical tips",
                "url": "/article/docs/gjt-practical-tips"
              }
          ]
      },
      {
          "title": "Events rules",
          "links": [
              {
                  "title": "Alakajam!",
                  "url": "/article/docs/alakajam-competition-rules"
              },
              {
                  "title": "Kajam",
                  "url": "/article/docs/kajam-rules"
              },
              {
                  "title": "Feedback Fortnight",
                  "url": "/article/docs/feedback-fortnight-rules"
              },
              {
                  "title": "F.A.Q.",
                  "url": "/article/docs/faq"
              }
          ]
      },
      {
          "title": "Tools",
          "links": [
              {
                  "title": "JSON API",
                  "url": "/api"
              }
          ]
      }
    ]
}`;
}
