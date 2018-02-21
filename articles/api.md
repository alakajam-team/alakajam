JSON API
## General tips ##

* Append `?pretty=true` to get a human-readable output of the data
* If something goes wrong, the response will always have the format: `{ "error": "..." }`

## Endpoints ##

| Endpoint | Parameters | Description |
| --- | --- | --- |
| [`/api/featuredEvent`](/api/featuredEvent?pretty=true) | (none) | Fetches the currently featured event (the one that currently appears in the header, usually the current or upcoming event), and its entries. |
| [`/api/event/:event`](/api/event/4?pretty=true) | `event` An event ID, or its name (as visible in its URL) | Fetches an event and its entries. |
| [`/api/event/:event/shortlist`](/api/event/4/shortlist?pretty=true) | `event` An event ID, or its name (as visible in its URL) | Lists the shortlisted themes and their current status. An additional "nextElimination" field is an ISO 8601 date or `null`. |
| [`/api/entry/:entry`](/api/entry/65?pretty=true) | `entry` An entry ID | Fetches an entry and detailed information about it: its comments, its ratings & rankings (if the event is closed) and some more metadata. |
| [`/api/user`](/api/user?title=Jamician&pretty=true) | `?title` A display name to search for | Searches for a user based on the parameters given. |
| [`/api/user/:user`](/api/user/1?pretty=true) | `user` A user ID, or their name | Fetches a specific user. |
| [`/api/user/:user/latestEntry`](/api/user/13/latestEntry?pretty=true) | `user`: A user ID, or their name | Fetches a specific user's latest entry, with similarly detailed information as the main entry endpoint. |
