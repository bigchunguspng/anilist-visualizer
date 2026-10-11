# AniListNet fork and relationship to this application

## Provenance

`src/AniListNet` is a git submodule whose configured origin is:

`https://github.com/bigchunguspng/AniListNet.git`

Its README identifies the upstream project as `dentolos19/AniListNet`, an MIT
licensed .NET wrapper around the AniList GraphQL API. The fork keeps the
upstream library's general purpose scope and self-generated GraphQL client.
The local submodule is pinned to commit `47c4e6a` on `main`, which is the
fork's merge of the `feature/flexibility` work.

The parent application references the library project directly from
`src/API/API.csproj`; it does not consume a NuGet package.

## Upstream library capabilities retained

The library contains generic GraphQL selection/parameter generation and JSON
parsing, pagination, search, user/media queries, mutations, and domain models
for users, media, characters, staff, studios, reviews, schedules,
recommendations, trends, and list entries.

The visualizer uses only a small public-read subset:

- `AniClient.GetAsync<User>(id, "User")`;
- generic paginated `users` search;
- generic paginated `mediaList`;
- generic paginated `activities`;
- user ID and filter parameter helpers;
- AniList media/user model attributes and enums;
- media relation and cover data needed for timeline grouping.

It does not use authentication, mutations, favorites, reviews, schedules,
recommendations, or most of the library's broader object model.

## Fork-specific changes visible in local history

The fork history includes application-relevant library maintenance beyond the
original project, including:

- exposing helper classes needed by the application;
- generic refactoring for get/search operations;
- adding `updatedAt` to the user model;
- adding a paginated overload that can parse GraphQL inline fragments
  (`"... on"`), used by activity results;
- parser and compatibility fixes, dependency/version updates, and method
  extensions.

The exact fork commits are visible in the submodule history; the parent repo
pins the submodule commit rather than recording a source diff.

## Application-specific models are not part of the fork

The timeline DTOs and transformations live in `src/API/Objects` and
`src/API/Services`, not AniListNet. In particular, the following are
visualizer behavior:

- `Animanga`, `TimelineItem`, and `AiringTimelineItem`;
- `TitleActivities` and `MixedActivities`;
- relation-based series grouping;
- date repair, cover normalization, timeline percentage calculations;
- tooltip text and average watching/reading speed;
- the five-status fetch strategy and server cache.

For the static rewrite, AniListNet itself should not be ported wholesale.
Its small set of GraphQL selections and the application-specific
post-processing are the relevant source material for browser JavaScript.
