# Last updated Nov. 2nd, 2020

## Upgrade required

```
Package                                  Current   Wanted   Latest  Location
eslint                                     6.8.0    6.8.0   7.12.1  alakajam
flipclock                                  0.7.8    0.7.8   0.10.8  alakajam
pg                                        7.18.2   7.18.2    8.4.2  alakajam
sqlite3                                    4.2.0    4.2.0    5.0.0  alakajam
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

* TypeORM

v0.2.25+ break code to add ILike support. v0.2.29 will support it natively.  
Resolution: Wait for v0.2.29 to release.  

```
Package                                  Current   Wanted   Latest  Location
typeorm                                   0.2.24   0.2.28   0.2.28  alakajam
```
