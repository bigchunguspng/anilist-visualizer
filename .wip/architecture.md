# Current application architecture

## Product behavior

AniList Visualizer accepts an AniList username, finds the matching public
AniList user, and renders the user's anime/manga list as a timeline. The
timeline uses list start/completion dates, current status, progress, media
relations, airing dates, covers, and recorded media-list activities.

The UI has two views:

1. **Overview**: one row per visible anime/manga title. A row contains a
   cover, localized title, list status, a date-scaled bar, optional airing
   interval, progress/activity marks, and hover details.
2. **Last 3 months**: a day-by-day activity chart. Each activity is plotted
   with height based on episodes/chapters progressed; clicking a title
   highlights its activities and shows its cover.

The overview supports:

- all-time, selected year range, or last-year filtering;
- English/Japanese title switching;
- grouping related entries into series;
- normal/reversed row order;
- keyboard shortcuts `J`, `G`, and `R`;
- clicking a title bar to load detailed activities for that title.

Preferences are stored in cookies (`lang`, `group`, `order`) for roughly 90
days. The app does not authenticate the AniList user or mutate AniList data.

## Runtime flow

### Search and routing

- `/` renders the search page.
- Pressing Enter calls `GET /api/user/search/{query}`.
- Search results link to `/user/{username}`.
- `/user/:username` calls `GET /api/user/{username}`.
- A missing route renders a custom not-found page.

The React app uses `BrowserRouter`, so direct deep links require host fallback
configuration. GitHub Pages does not provide that fallback by default.

### Backend routes

All routes are under `api/[controller]`, with lowercase URL generation.

| Route | Purpose | AniList operation |
| --- | --- | --- |
| `GET /api/user/{id}` | Load a user by numeric ID | `User(id)` |
| `GET /api/user/{username}` | Find the first user matching a username | paginated `users(search)` with page size 1 |
| `GET /api/user/search/{query}` | Search users | paginated `users(search)` |
| `GET /api/animanga/{userId}` | All non-PLANNING list entries | `mediaList` for five statuses |
| `GET /api/animanga/{userId}/{from}/{to}` | Entries overlapping year range | same list, server filters timeline |
| `GET /api/animanga/{userId}/last-year` | Entries overlapping the previous 365 days | same list, server filters timeline |
| `GET /api/activities/{userId}/{mediaId}` | Activities for one title | paginated `activities` with `MEDIA_LIST`, user, media |
| `GET /api/activities/{userId}/last-3-months` | Mixed activity chart data | paginated `activities` bounded to today +/- 3 months |

The service fetches all pages at 50 items per page. Anime/manga entries are
requested concurrently for `CURRENT`, `COMPLETED`, `DROPPED`, `PAUSED`, and
`REPEATING`; `PLANNING` is deliberately excluded.

### AniList GraphQL flow

`AniListNet.AniClient` posts generated GraphQL queries to
`https://graphql.anilist.co`. The backend's DTO attributes describe the
required selections, and `GqlParser` creates selections and parses responses.
No AniList token is configured or required for the visualizer's public queries.

### Backend normalization

`AnimangaService`:

- combines all five status lists;
- de-duplicates by media ID;
- merges related media into a series using non-character relations;
- assigns the smallest related media ID as `SeriesId`;
- repairs missing/invalid dates and cover URL/color data;
- sorts by start date, completion date, then entry ID.

`Animanga` then:

- removes entries without a start date from the drawable timeline;
- calculates Unix-day bounds, year/month sections, and series counts;
- selects entries overlapping a requested time window;
- creates timeline offsets and lengths;
- creates tooltip text, average speed, repeat count, and optional activities;
- creates an airing interval for each media item.

Airing labels preserve the legacy formatter: seasonal media use day-month
ranges, while media without a season (typically manga) use month-year ranges,
including open-ended labels such as `Oct 2012 →`.

Activity normalization removes zero-progress events and merges events from the
same day into one event (including progress ranges such as `21 - 23`).
Last-3-month data is grouped by media and then by day.

### Caching and errors

The ASP.NET process has singleton in-memory caches for users, media entries,
and per-title activities. User timestamps determine whether cached entries are
new enough; activity/list data without a known user cache is considered fresh
for 15 minutes. The API also advertises 30-second response caching for user
and activity routes.

Exceptions are logged and converted to `404` or `400` responses depending on
the controller path. The React fetch hook exposes only a string error and
otherwise displays `Loading...`.

## Important response shapes

### User

`{ id, name, avatar: { large, medium }, updatedAt, url, lastActivity }`

### Animanga

`{ minDay, maxDay, today, years, timelineSections, seriesShown,
seriesTotal, entries }`

Each entry includes media metadata, numeric status/progress/repeats, and a
nullable `timelineItem`. Media includes title, type, cover, AniList URL,
episode/chapter count, `seriesId`, and nullable airing `timelineItem`.

### TitleActivities

`{ maxProgressValue, activities }`, where each activity has day, progress,
and optional episode/chapter text.

### MixedActivities

`{ maxProgressValue, smallerUnits, biggerUnits, activities }`. `activities`
is an array indexed by day, and each item contains media summary, day,
progress, and optional episode/chapter text.

## Client-only presentation details

The frontend supplies the visual layout rather than the backend: CSS
variables position bars as percentages, covers use AniList CDN URLs, and
hover tips are positioned with DOM measurements. It also references external
images hosted on Imgur and status SVGs under `svg/status`.

The current API base URL is hard-coded to
`http://192.168.0.103:5000/api`, so the checked-in frontend is intended for
the author's LAN rather than public hosting.

## Static Phase 4 frontend

The rewrite lives at the repository root, which is the GitHub Pages publishing
source. `index.html` is the only application document and loads the vanilla ES
module `main.js` plus `styles.css`. Hash routing avoids GitHub Pages
server fallback requirements: `#/` is home, `#/user/{username}` is the user
page, and any other hash is the not-found view. `404.html` provides a basic
fallback when a host requests a missing file directly.

Because ES-module top-level bindings are not browser globals, `main.js` assigns
its live `app_state` object to `window.app_state`. This restores the console
inspectability available with the legacy classic scripts without duplicating or
serializing state.

The data client is `api.js`. It uses public POST requests, 50-item
pagination, in-flight request deduplication, and a bounded 15-minute
`sessionStorage` cache. It exposes user lookup/search, media-list,
title-activity, and range-activity functions.

The normalization layer is `domain.js`. `build_animanga` still owns
timeline bounds, overlap filtering, timeline sections, airing bars, and
optional activity attachment. `build_title_activities` and
`build_mixed_activities` now back the overview overlays and the last-three-
months chart.

`main.js` now renders the migrated UI in vanilla DOM/HTML using the
legacy React markup and behavior as the parity source:

- overview rows with localized titles, legacy status SVGs, AniList links, airing
  overlays, tooltips, and colored-rectangle-triggered title activity loading;
- browser-stored language/group/order preferences, year selectors, last-year
  filtering, and keyboard shortcuts (`J`, `G`, `R`);
- a last-three-month chart that fetches a three-month Unix timestamp range
  directly from AniList, shows the legacy cover preview on click, and restores
  all activities on double-click.

The legacy parity CSS must remain global. In particular, the legacy entry,
timeline, control, and chart selectors must not be nested under the
`max-width: 449px` media query; doing so causes desktop to fall back to the
incompatible Phase 4 card/grid rules.

Phase 5 is now verification work: real-browser/mobile validation, error-path
testing, deep-link refresh checks, and GitHub Pages deployment checks.

## Recent parity fixes

- `domain.js` now advances the merged same-day progress endpoint from
  the current endpoint, including activities whose `progress` is omitted but
  whose completed status still contributes one unit. This preserves ranges
  such as `4 - 8` with five chapters.
- Three-month chart month units are clipped against actual calendar-month
  boundaries, so a range spanning four calendar months renders four correctly
  sized labels.
- `main.js` positions title activity overlays against the full overview
  timeline rather than the narrow entry range. Activity before or after a
  completed watch/read period remains visible at its real date without huge
  range-relative offsets.
- Static media previews now request and layer AniList medium and large cover
  URLs, matching the legacy fallback behavior for overview covers and the
  three-month selected-title preview.
- Static tooltip positioning restores the legacy overview right-edge correction
  and clamps both overview and three-month tips to the viewport.
