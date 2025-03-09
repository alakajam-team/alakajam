# Useful links

* Font Awesome icons https://fontawesome.com/v5/search
* Bootstrap
  * General https://getbootstrap.com/docs/4.1/getting-started/introduction/
  * CSS utilities https://getbootstrap.com/docs/4.1/utilities/flex/

## Blocked NPM versions

* Bookshelf

1.X has a blocking bug for us: https://github.com/alakajam-team/alakajam/issues/478  
Also forces Knex to a compatible version.  
Easiest resolution would be to contribute the fix to Bookshelf ourselves.  

```
Package                                  Current   Wanted   Latest  Location
@types/bookshelf                          0.13.3   0.13.3    1.1.1  alakajam
bookshelf                                 0.15.2   0.15.2    1.2.0  alakajam
knex                                      0.17.6   0.17.6  0.21.12  alakajam
```
