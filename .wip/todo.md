# Rewrite task checklist

Status as of 2026-10-15: Static visualization and controls are ported; the
reported progress, calendar-month, and out-of-period activity mismatches are
fixed; final real-browser/deployment verification remains.

## Analysis completed

- [x] Map ASP.NET controllers, services, caches, DTOs, and AniList calls.
- [x] Map React routes, views, controls, preferences, and rendering.
- [x] Record AniListNet submodule provenance and application usage.
- [x] Assess static GitHub Pages feasibility and behavior changes.

## Next implementation tasks

- [x] Choose the static directory and GitHub Pages deployment strategy.
- [x] Choose hash routing versus a `404.html` fallback.
- [x] Add the static HTML/CSS/JS shell and loading/error/not-found states.
- [x] Implement the minimal direct AniList GraphQL client.
- [x] Add page-size-50 pagination, explicit API error categories, request
  deduplication, and bounded session caching.
- [x] Wire user search and profile lookup into the static shell.
- [x] Port server normalization into browser-side modules.
- [x] Port timeline, date, relation, overlap, and activity transformations.
- [x] Port the home/search/user/overview/three-month UI.
- [x] Match same-day activity progress ranges when AniList omits completed
  progress endpoints.
- [x] Align three-month month labels to clipped calendar-month boundaries,
  including all overlapping months.
- [x] Show overview activity marks that fall outside an entry's watch/read
  period, matching the React overlay overflow behavior.
- [x] Add concise in-place JSDoc contracts and examples for non-obvious
  functions in `static/domain.js`, `static/api.js`, and `static/main.js`.
- [x] Match legacy airing-tip date formatting: media without a season uses
  month-year text (for example, `Oct 2012 →`) even when its start predates the
  visible timeline.
- [x] Use medium/large cover fallbacks for overview and three-month previews,
  and keep legacy tooltips within the viewport.
- [x] Expose the live static application state as `window.app_state` for
  browser-console inspection.
- [ ] Add loading, empty, GraphQL, rate-limit, CORS, and offline states.
- [ ] Verify external image/CDN behavior and AniList API response shape.
- [ ] Test pagination, filters, mobile interaction, deep links, and deployment.

## Phase 4 shipped

- Static `main.js` now renders the overview and last-three-month views end to
  end.
- Overview rows use the legacy React markup and status SVGs, with activity
  loading only from the colored timeline rectangle.
- Chart mode loads range activities through `get_range_activities` plus
  `build_mixed_activities`, preserving hover, click highlight, cover preview,
  and double-click restore behavior.
- No new preview-card, status-pill, or clear-highlight UI is part of the port.

## Phase 5 remaining

- Verify behavior with empty users, missing dates, long titles, manga-heavy
  lists, repeated titles, and sparse/no activity data.
- Exercise API failure paths, rate-limit messaging, direct deep links, and
  GitHub Pages deployment/base-path behavior in real browsers.

## Style parity handoff

- Static CSS now uses the legacy Google fonts and the original `favicon.png`.
- Search rows retain the old neutral hover and enlarge the avatar on hover.
- Legacy title/user spacing, year-control alignment, navbar logo typography,
  user-header inset, avatar animation, and overview hint placement are restored.
- Tooltip coordinates now use their actual absolute positioning context for
  overview and three-month tips; reverse ordering uses the legacy
  column-reverse layout; fetched timeline details use the legacy translucent
  rectangle color while activity days remain opaque, and repeat tips are
  accented.

Rewrite-wide constraints and conventions are maintained in
`rewrite-rules.md`.

## Known source risks

- Current frontend API URL is a private LAN address.
- Current React hook logs and swallows detailed fetch errors.
- Current `BrowserRouter` needs GitHub Pages fallback handling.
- Current backend catches broad exceptions and returns generic status codes.
- `MixedActivities` assumes at least one non-zero activity when calculating
  min/max days; the static implementation must handle an empty range safely.
- `MediaCover.FixData` assumes AniList's anime cover URL prefix; media-type
  URL handling should be verified during the port.
