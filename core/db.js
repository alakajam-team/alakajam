'use strict'

/**
 * Database storage configuration.
 * Requiring the module returns a [Bookshelf](http://bookshelfjs.org/) instance.
 *
 * @module core/db
 */

const moment = require('moment')
const promisify = require('promisify-node')
const fs = promisify('fs')
const path = require('path')
const config = require('../config')
const knexfile = require('../knexfile')
const constants = require('../core/constants')
const log = require('../core/log')

module.exports = initBookshelf()

function initBookshelf () {
  let knex = createKnexInstance()
  let bookshelf = createBookshelfInstance(knex)

  /**
   * Updates the database to the latest version
   * @param  {boolean} withSamples
   * @return {string} the DB version after upgrading
   */
  bookshelf.initDatabase = async function (withSamples) {
    log.info('Upgrading database...')
    let previousVersion = await knex.migrate.currentVersion()
    await knex.migrate.latest(knexfile)
    let newVersion = await knex.migrate.currentVersion()

    if (previousVersion !== newVersion) {
      log.info('Upgraded database from version ' + previousVersion + ' to ' + newVersion)
    } else {
      log.info('Database is already at version ' + newVersion)
    }
    if (previousVersion === 'none') {
      await insertInitialData(withSamples)
    }
    return newVersion
  }

  /**
   * Downgrades the database until it is emptied.
   * @return {void}
   */
  bookshelf.emptyDatabase = async function () {
    let rollbackResult
    do {
      rollbackResult = await knex.migrate.rollback()
    } while (rollbackResult[0] !== 0)
  }

  return bookshelf
}

/*
 * Knex (SQL builder) init
 * @return {Knex}
 */
function createKnexInstance () {
  let knexOptions = {
    client: config.DB_TYPE,
    useNullAsDefault: true,
    debug: config.DEBUG_SQL
  }

  if (config.DB_TYPE === 'sqlite3') {
    knexOptions.connection = {
      filename: path.join(__dirname, '..', config.DB_SQLITE_FILENAME)
    }
  } else {
    knexOptions.connection = {
      host: config.DB_HOST,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      charset: 'utf8'
    }
  }
  return require('knex')(knexOptions)
}

/*
 * Bookshelf (ORM) init with custom methods.
 * @param  {Knex} knex
 * @return {void}
 */
function createBookshelfInstance (knex) {
  let bookshelf = require('bookshelf')(knex)
  bookshelf.plugin('registry')
  bookshelf.plugin('pagination')
  bookshelf.plugin(require('bookshelf-cascade-delete'))
  return bookshelf
}

/**
 * Inserts sample data in the database.
 * @param {Bookshelf} bookshelf
 * @param {bool|string} samples true to add samples, 'nightly' to add the special nighly post
 * @returns {void}
 */
async function insertInitialData (samples) {
  const models = require('../core/models')
  const userService = require('../services/user-service')
  const eventService = require('../services/event-service')
  const postService = require('../services/post-service')
  const settingService = require('../services/setting-service')

  // Mandatory admin account

  await userService.register('administrator@example.com', 'administrator', 'administrator')
  let adminUser = await userService.findByName('administrator')
  adminUser.set({
    'title': 'Administrator',
    is_admin: true
  })
  await adminUser.save()

  // Samples

  if (samples) {
    log.info('Inserting samples...')

    // Users

    await userService.register('entrant@example.com', 'entrant', 'entrant')
    let entrantUser = await userService.findByName('entrant')
    entrantUser.set({
      'title': 'Entrant'
    })
    await entrantUser.related('details').set({
      'body': 'I am definitely **not** a robot.'
    }).save()

    // Articles
    let post = await postService.createPost(adminUser)
    post.set({
      title: 'About Alakajam',
      name: 'help',
      body: `*Alakajam!* is a brand new gamedev community created by [Ludum Dare](http://ldjam.com/) veterans. Because the world always needs more game jams, we're launching this site with the goal to host:
* **Alakajam!** competitions, taking place over a week-end, with start/end times suited to Europan timezones.
* **Kajam!** month-long events, inviting people to learn and experiment around a specific topic.
* And finally **Feedback Fortnights**, to show off projects made outside of game jams.

The initiative was launched by [@wan](/user/wan), author of the [Feedback Friends](http://feedback.ld.intricati.com/) mini-site. If you want to give a hand to this brand new community: spread the word, [give feedback](https://docs.google.com/forms/d/e/1FAIpQLScjMwNehfQBGKvsMEE2VYuH_9WbbNb2hZ3F1dIC_UPy9c294w/viewform?usp=sf_link) and why not [join us on Github](https://github.com/mkalam-alami/alakajam)!

![](https://i.imgur.com/cpkZjfr.pnghttp://)`,
      special_post_type: 'article',
      published_at: new Date()
    })
    await post.save()

    post = await postService.createPost(adminUser)
    post.set({
      title: 'Feedback Fortnight!',
      name: 'feedback-fortnight',
      body: `## Before the event
Until the event starts, all you can do is create blog posts. Feel free to introduce yourself or the game you plan to make/submit.
## Submitting a game
Once the event starts, you can submit **any game you worked on this year**. You can use this event as a game jam, making and submitting a game especially for it, though there is no particular "theme" to follow.
It's okay if the game is unfinished, closed-source, made as a team, we don't mind either if the game was started before 2017. The only requirements are that the game must be yours.
## Exchanging feedback
Any comment you post on another entry will count towards increasing your *Feedback Score*. That score is used to determine in which order games are listed on the event. You will get notifications if someone wrote a comment on your entry or answered your comments using @-based mentions.
## After the event
Newcomers will no longer be able to submit games, but you can still exchange feedback after the event ends.
There will be no judging or ranking or the game, but instead as a reward, videos will be made of all the entries and posted on YouTube.`,
      special_post_type: 'article',
      published_at: new Date()
    })
    await post.save()

    post = await postService.createPost(adminUser)
    post.set({
      title: 'Feedback & Bugs reports',
      name: 'feedback',
      body: `This site just launched, so you will most probably encounter bugs. Please report them there:  
#### **[Support form](https://docs.google.com/forms/d/e/1FAIpQLScjMwNehfQBGKvsMEE2VYuH_9WbbNb2hZ3F1dIC_UPy9c294w/viewform)**
## Contacting us

* [AlakajamBang](https://twitter.com/AlakajamBang) on Twitter
* contact *[[at]]* alakajam *[[dot]]* com
`,
      special_post_type: 'article',
      published_at: new Date()
    })
    await post.save()

    // 1st event

    let event1 = new models.Event({
      title: '1st Alakajam',
      name: '1st-alakajam',
      status: 'closed',
      display_dates: 'Novembary 17 - 20, 2016',
      display_theme: 'Make a website',
      status_theme: 'disabled',
      status_entry: 'on',
      status_results: 'disabled'
    })
    await event1.save()
    let userEntry = await eventService.createEntry(entrantUser, event1)
    userEntry.set('title', 'Old Game')
    await userEntry.save()

    // 2nd event

    let event2 = new models.Event({
      title: '2nd Alakajam',
      name: '2nd-alakajam',
      status: 'open',
      display_dates: 'Januember 29 - 31, 2017',
      display_theme: 'You are not alone',
      status_theme: 'disabled',
      status_entry: 'on',
      status_results: 'off',
      countdown_config: {
        phrase: 'starts in',
        date: moment().add(1, 'days').toDate()
      }
    })
    await event2.save()

    await settingService.save(constants.SETTING_FEATURED_EVENT_NAME, '2nd-alakajam')
    await settingService.save(constants.SETTING_FEATURED_ARTICLE_LINKS, '{"links":[{"title":"About us","url":"/article/help","subLinks":[{"title":"Feedback & Bugs reports","url":"/article/feedback"}]},{"title":"Feedback Fortnight!","url":"/article/feedback-fortnight"}],"external_links":[{"title":"Github","url":"https://github.com/mkalam-alami/alakajam"},{"title":"Twitter","url":"https://twitter.com/AlakajamBang"}]}')

    let adminEntry = await eventService.createEntry(adminUser, event1)
    adminEntry.set('title', 'Super Game')
    await adminEntry.save()
    userEntry = await eventService.createEntry(entrantUser, event2)
    userEntry.set('title', 'Awesome Game')
    await userEntry.save()

    post = await postService.createPost(entrantUser)
    post.set({
      title: "I'm in!",
      body: "This is my second game and I'm really excited.",
      event_id: event2.get('id'),
      entry_id: userEntry.get('id'),
      published_at: new Date()
    })
    await post.save()

    post = await postService.createPost(adminUser)
    post.set({
      title: 'Event started!',
      body: 'The theme is `You are not alone`. Have fun!',
      event_id: event2.get('id'),
      special_post_type: constants.SPECIAL_POST_TYPE_ANNOUNCEMENT,
      published_at: new Date()
    })
    if (samples === 'nightly') {
      let changesBuffer = await fs.readFile(path.join(__dirname, '../tests/nightly/CHANGES.md'))
      post.set({
        title: 'Nightly: ' + moment().format('MMMM Do YYYY'),
        body: changesBuffer.toString()
      })
    }
    await post.save()
    event2.set('status_rules', post.get('id'))
    await event2.save()

    await postService.createComment(entrantUser, post, "I'm in!")
    await postService.refreshCommentCount(post)

    // Planned 3rd event

    let event3 = new models.Event({
      title: '3rd Alakajam',
      name: '3rd-alakajam',
      status: 'pending',
      display_dates: 'Marchpril 5 - 8, 2017',
      status_theme: 'off',
      status_entry: 'off',
      status_results: 'off'
    })
    await event3.save()

    log.info('Samples inserted')
  }
}
