JSON API
## General tips ##

* Append `?pretty=true` to get a human-readable output of the data
* Append `?callback=yourFunction` for <a href="https://en.wikipedia.org/wiki/JSONP">JSONP</a> support
* If something goes wrong, the response will always have the format: `{ "error": "..." }`

## Endpoints ##

| Endpoint | Parameters | Description |
| --- | --- | --- |
| [`/api/featuredEvent`](/api/featuredEvent?pretty=true) | (none) | Fetches the currently featured event (the one that currently appears in the header, usually the current or upcoming event), and its entries. |
| [`/api/event`](/api/event?pretty=true) | `?page` A page number (page size is 10), starts with 1. | Fetches the most recently published events, including pending ones. |
| [`/api/event/:event`](/api/event/1st-alakajam?pretty=true) | `event` An event ID, or its name (as visible in its URL) | Fetches an event and its entries. |
| [`/api/event/:event/shortlist`](/api/event/1st-alakajam/shortlist?pretty=true) | `event` An event ID, or its name (as visible in its URL) | Lists the shortlisted themes and their current status. A list of user names who chose the theme as their top picks is also available as soon as shortlist voting closes.<br />An additional "nextElimination" field is an ISO 8601 date or `null`. |
| [`/api/entry/:entry`](/api/entry/65?pretty=true) | `entry` An entry ID | Fetches an entry and detailed information about it: its comments, its ratings & rankings (if the event is closed) and some more metadata. |
| [`/api/user`](/api/user?title=Jamician&pretty=true) | `?title` A display name to search for <br />`?page` A page number (page size is 30), starts with 1. | Searches for users. |
| [`/api/user/:user`](/api/user/voxel?pretty=true) | `user` A user ID, or their name | Fetches a specific user. |
| [`/api/user/:user/latestEntry`](/api/user/voxel/latestEntry?pretty=true) | `user` A user ID, or their name | Fetches a specific user's latest entry, with similarly detailed information as the main entry endpoint. |
| [`/api/theme/:theme`](/api/theme/Floating%20Islands?pretty=true) | `theme` A theme name | Fetches stats about the history of a theme. |