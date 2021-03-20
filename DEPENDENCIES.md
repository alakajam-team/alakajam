# NPM dependencies analysis

> Last updated Nov. 11, 2020

## Pending upgrades

```
None
```

## Blocked versions

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

* Webpack

`@cypress/webpack-preprocessor` breaks on Webpack 5 due to https://github.com/cypress-io/cypress/issues/8948.

```
Package                                  Current  Wanted   Latest  Location
webpack                                   4.44.2  4.44.2    5.4.0  alakajam
terser-webpack-plugin                      4.2.3   4.2.3    5.0.3  alakajam
```