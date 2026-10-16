# Static rewrite implementation plan

This is a proposed sequence for the next implementation agent.

## Phase 1: establish static shell

- Keep the static application at repository root so GitHub Pages can publish
  the branch root directly.
- Add `index.html`, CSS entrypoint, JS module entrypoint, and `404.html` or
  hash routing.
- Recreate home/search, user header, footer, loading, error, and not-found
  states.

## Phase 2: port data access

- Write minimal AniList GraphQL queries for user lookup, user search, media
  lists, title activities, and three-month activities.
- Implement `pageInfo.hasNextPage` pagination at 50 items.
- Surface GraphQL, HTTP, rate-limit, and network errors explicitly.
- Add request deduplication and bounded browser/session caching.

## Phase 3: port domain transformations

- Port status fetching and de-duplication.
- Port relation-based series grouping.
- Port date/cover normalization.
- Port all-time/year/last-year overlap filtering.
- Port timeline sections, offsets, lengths, airing bars, speed text, and
  activity aggregation.
- Preserve the current response-independent view model so rendering stays
  simple.

## Phase 4: port visualizations and controls

- Recreate overview rows, title localization, statuses, hover previews,
  activity overlays, tooltips, and external AniList links.
- Recreate language/group/order controls using browser storage instead of
  cookies, plus keyboard shortcuts and
  year selectors.
- Recreate the last-three-month chart, title highlighting, and tooltips.
- Ensure touch/mobile behavior does not depend on mouse hover.

## Phase 5: verify and publish

- Test with users containing empty lists, missing dates, ongoing entries,
  manga, anime, related-series entries, repeats, and multi-episode activity.
- Test pagination, malformed/failed API responses, rate limiting, direct
  deep links, refreshes, and GitHub Pages base paths.
- Build/deploy the repository root through the chosen GitHub Pages workflow or
  branch-root Pages source.

## Decisions to preserve unless intentionally changed

- Exclude `PLANNING` list entries.
- Treat anime progress as episodes and manga progress as chapters.
- Use English title fallback to romaji and Japanese title from native data.
- Use public AniList requests only; do not ship a token.
- Keep current timeline semantics: end date defaults to today and year/last-
  year filters include entries overlapping the selected range.
