# Rewrite task checklist

Status as of 2026-10-11: Phases 1-3 are complete; visualization and controls
remain.

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
- [ ] Add loading, empty, GraphQL, rate-limit, CORS, and offline states.
- [ ] Verify external image/CDN behavior and AniList API response shape.
- [ ] Test pagination, filters, mobile interaction, deep links, and deployment.

## Phase 4 shipped

- Static `main.js` now renders the overview and last-three-month views end to
  end.
- Overview rows include localized titles, status badges, AniList links, airing
  overlays, title-activity overlays, keyboard shortcuts (`J`, `G`, `R`), year
  filters, last-year/all filters, and browser-stored preferences.
- Row selection loads per-title activities through `get_title_activities`, and
  chart mode loads range activities through `get_range_activities` plus
  `build_mixed_activities`.
- Desktop hover still shows tooltips, while touch/keyboard users can open the
  same details through click/focus-safe controls and persistent preview cards.

## Phase 5 remaining

- Verify behavior with empty users, missing dates, long titles, manga-heavy
  lists, repeated titles, and sparse/no activity data.
- Exercise API failure paths, rate-limit messaging, direct deep links, and
  GitHub Pages deployment/base-path behavior in real browsers.

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
