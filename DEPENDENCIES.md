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

* TypeScript ESLint

4.6.0 defaults dislike any which is a big effort. v2.34 forces TypeScript to < 4.0.  
Resolution: upgrade and introduce ignores - temporary or permanent depending on the rule.  
Use of `any` should still be tolerated if only to welcome contributions for TypeScript newbies.  

```
Package                                  Current   Wanted   Latest  Location
@typescript-eslint/eslint-plugin          2.34.0   2.34.0    4.6.0  alakajam
@typescript-eslint/eslint-plugin-tslint   2.34.0   2.34.0    4.6.0  alakajam
@typescript-eslint/parser                 2.34.0   2.34.0    4.6.0  alakajam
typescript                                 3.9.7    3.9.7    4.0.5  alakajam
```

* Webpack

`@cypress/webpack-preprocessor` breaks on Webpack 5 due to https://github.com/cypress-io/cypress/issues/8948.

```
Package                                  Current  Wanted   Latest  Location
webpack                                   4.44.2  4.44.2    5.4.0  alakajam
terser-webpack-plugin                      4.2.3   4.2.3    5.0.3  alakajam
```