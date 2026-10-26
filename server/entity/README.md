# TypeORM entities

> /!\ Early work

These entities are work in progress. The goal is to progressively migrate from Bookshelf to TypeORM,
but for now most parts of the database are exclusively available in Bookshelf (see core/models.ts).

## Writing entities

Type singular relations (`@ManyToOne`, `@OneToOne`) with the `Relation<T>` wrapper from `relation.ts`, for instance `public user: Relation<User>;`.
The dev server is compiled with SWC, which emits decorator metadata referencing the related class directly: with circular entity imports, a bare `User` type crashes the server at startup with "Cannot access 'X' before initialization".
