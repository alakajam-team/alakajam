# Site changelog

> You can help with the site development by joining us on [Github](https://github.com/mkalam-alami/alakajam)!

### February 20th

* Support eliminating shortlist themes one by one in the moments before the jam starts
* Front page layout improvements

### February 5th

* Front page got several little layout changes

## 2017

### November 24nd

* Non-visible work on back end: rework CSS/JS build toolchain (switching to webpack)

### November 22nd

* Mods can now manage events just like admins

### October 19th

* Added lazy loading for most pictures to make pages load faster

### October 18th

* Events page displays the winners of the past events

### October 14th

* Imgur GIFV embeds are allowed in posts

## [October 13th: 1st Kajam! launch](https://alakajam.com/post/232/juice-up-your-games)

### October 13th

* Admins can customize the divisions per-event
* Voting results page display the number of games per division

### October 11th

* Reorganized the front page, adding the schedule for the next events

### October 9th

* Reworked logo
* Expose ratings & rankings in the REST API

### October 8th

* Let people filter out the games they rated/commented on

### October 6th

* Reworked competition results page, with pretty trophy pictures

### October 3th

* Final rankings and ratings have been added to the entry page

### October 2nd

* Game rescue block added
* Ratings management: team & solo entries are split into two columns
* Non-visible work on back end: tweak asset URLs to support CloudFlare

### September 29th

* Custom Markdown guide added (click "?" in the editor toolbar)
* User names now appear next to display names if they differ, to aid mentions
* Posts and comments can now be much longer than before

### September 26th

* Non-visible work on back end: reorganize client-side JS to make development easier
* Games page features pagination

### September 25th

* Reorganized entry sidebar
* Games page displays entries from the current event by default, sorted by Feedback Score
* Non-visible work on back end: form parsing library replaced to fix various major bugs

### September 24th

* Feedback Score takes votes in account
* Support for Unranked division
* Users can see the voting count progress on their own entry

### September 23th

* Articles now fetch their Markdown directly from Github, so they can update without re-reploying the server

### September 22th

* Rewritten article system with Markdown files as the backend, to let anyone contribute
* Theme results page: people can see again how they ranked their shortlist

## [September 22th: 1st Alakajam! launch](https://alakajam.com/post/23)

### September 21th

* Add support for featured links & hidden posts (to be used temporarily for wallpapers, streamers etc.)

### September 17th

* Support for anonymous comments
* Entries can opt-out of graphics/audio

### September 15th

* Raw URLs put inside posts are now converted to links automatically
* Eliminated themes can now see how successful they were %-wise

### September 14th

* Better display of the event navbar on thin mobile screens

### September 13th

* Make logging in redirect to the previous page

### September 11th

* Platform management is now distinct from links

### September 9th

* Reworked theme submission UI
* Added support for allowing more than 3 themes ideas

### September 7th

* Markdown editor has new formatting options (text/images alignment)

### September 6th

* People page now has a search form
* Pagination added to various pages
* Changes are no longer lost when there's a validation error upon saving an entry
* Some pages like the game browser & the user dashboard are now full-width
* Posts styling and layout have been tweaked
* Changelog & JSON API pages now integrate the Help sidebar

### September 4th

* Game browser added as a global tab

### September 3rd

* Theme voting system is completed (stats, theme elimination, appearance to anonymous users)
* Theme voting supports a "shortlist ranking" phase
* Admins can enable an event-related "call to action" block on the home page

### September 1st

* Adding people to a team now sends them an invite, that they have to accept or decline
* Browsers now make you confirm before closing the tab if you have pending changes in a post
* Alakajam! links now look pretty when shared on Facebook

### August 29th

* Entry voting system, with the ability to view past votes
* Event results page
* Users can now add games made in external jams
* Team members can now leave the entry

### August 27th

* Team support: users can add other people to their games, granting access rights and listing those people as team members

### August 24th

* JSON API: new "latestEntry" endpoint

### August 18th

* JSON API
* HTTP calls are now throttled to 1 per second (except static resources)

### August 15th

* Basic theme voting system

### August 11th

* The help section now has a sidebar (configurable through an admin setting)
* Entry links now let you choose platforms

### August 3rd

* Site header now looks better on mobile & tablets

### July 27th

* Multiple SEO improvements

### July 19th

* Notification system
* Small performance improvements through caching

### July 17th

* Revamped home page

## [June 11th: 1st Feedback Fortnight launch](https://alakajam.com/post/5/introducing-feedback-fortnight)

### July 11th

* Feedback Score system for sorting entries
* Reorganized personal dashboard
* Alakajam! links now look pretty when shared on Twitter

### June 25th

* Added support for embeds & tables in Markdown
* Let the users set to which event a post should be attached
* Added pagination to blog posts
* Theme looks better on mobile

## [June 22th: Site launch](https://alakajam.com/post/2/welcome-to-alakajam)

### June 20th

* New event countdown (can be tweaked by editing the event)
* Entries can now have multiple links
* Disabled key-based invite system
* Various theme changes and bugfixes

### June 16th

* New "People" page in the header
* Changes to the user registration process
* Post drafts & articles now work better

### June 15th

* Article system (see the new "Feedback" header link)
* Events can now have theme voting and game results tabs. While the features are missing, admins can display blog posts in it instead.

### June 14th

* User dashboards now have a cool home page with a comment feed (not unlike Feedback Friends...)

### June 11th

* Admins can manage events and create new ones
* Admins can edit other users, and promote them to mods/admins
* Announcements tweaks

### June 7th

* Comments now work (both on blog posts and games)

### June 3rd

* Support for making posts (including announcements for moderators)
* Creating a new account now requires a shiny invite key (can be generated and shared by any user)
* Mods can edit any post or any game thanks to a special toolbar
* Form data is now sanitized
* URLs are now pretty

## [June 3rd: Nightly site launch](http://nightly.alakajam.com)
