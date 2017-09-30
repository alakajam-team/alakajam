JSON API
## General tips ##

* Append `?pretty=true` to get a human-readable output of the data.
* If something goes wrong, the response will always have the format: `{ "error": "..." }`

## Endpoints ##

| Endpoint | Parameters | Description |
| --- | --- | --- |
| `/api/featuredEvent` | (none) | Fetches the currently featured event (the one that currently appears in the header, usually the current or upcoming event), and its entries. |
| `/api/event/:event` | `event` An event ID, or its name (as visible in its URL) | Fetches an event and its entries. |
| `/api/entry/:entry` | `entry` An entry ID | Fetches an entry and its comments. |
| `/api/user` | `?title` A display name to search for | Searches for a user based on the parameters given. |
| `/api/user/:user` | `user` A user ID, or their name | Fetches a specific user. |
| `/api/user/:user/latestEntry` | `user`: A user ID, or their name | Fetches a specific user's latest entry. |
