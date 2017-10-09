JSON API
## General tips ##

* Append `?pretty=true` to get a human-readable output of the data.
* If something goes wrong, the response will always have the format: `{ "error": "..." }`

## Endpoints ##

| Endpoint | Parameters | Description |
| --- | --- | --- |
| [`/api/featuredEvent`](/api/featuredEvent) | (none) | Fetches the currently featured event (the one that currently appears in the header, usually the current or upcoming event), and its entries. |
| [`/api/event/:event`](/api/event/1) | `event` An event ID, or its name (as visible in its URL) | Fetches an event and its entries. |
| [`/api/entry/:entry`](/api/entry/1) | `entry` An entry ID | Fetches an entry and its comments. |
| [`/api/user`](/api/user?title=Jamician) | `?title` A display name to search for | Searches for a user based on the parameters given. |
| [`/api/user/:user`](/api/user/1) | `user` A user ID, or their name | Fetches a specific user. |
| [`/api/user/:user/latestEntry`](/api/user/13/latestEntry) | `user`: A user ID, or their name | Fetches a specific user's latest entry. |
