# Rewrite handoff checklist

## Analysis completed

- [x] Map ASP.NET controllers, services, caches, DTOs, and AniList calls.
- [x] Map React routes, views, controls, preferences, and rendering.
- [x] Record AniListNet submodule provenance and application usage.
- [x] Assess static GitHub Pages feasibility and behavior changes.

## Next agent

- [ ] Choose static directory and GitHub Pages deployment strategy.
- [ ] Choose hash routing versus `404.html` fallback.
- [ ] Implement minimal direct AniList GraphQL client.
- [ ] Port server normalization into browser-side modules.
- [ ] Port home/search/user/overview/three-month UI.
- [ ] Add robust loading, empty, GraphQL, rate-limit, CORS, and offline states.
- [ ] Verify external image/CDN behavior and AniList API response shape.
- [ ] Test pagination, filters, mobile interaction, deep links, and deployment.

## Persistent constraints

- [ ] Use browser storage (`localStorage` preferred) instead of cookies for
  rewritten preferences and cache data where appropriate.
- [ ] Preserve all original source files until the owner deletes them.
- [ ] Keep existing Imgur URLs until the owner replaces them with local files.
- [ ] Follow the naming, CSS, indentation, alignment, and comment conventions
  in `rewrite-rules.md`.

## Known source risks

- Current frontend API URL is a private LAN address.
- Current React hook logs and swallows detailed fetch errors.
- Current `BrowserRouter` needs GitHub Pages fallback handling.
- Current backend catches broad exceptions and returns generic status codes.
- `MixedActivities` assumes at least one non-zero activity when calculating
  min/max days; the static implementation must handle an empty range safely.
- `MediaCover.FixData` assumes AniList's anime cover URL prefix; media-type
  URL handling should be verified during the port.
