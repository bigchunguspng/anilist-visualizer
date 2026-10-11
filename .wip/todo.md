# Rewrite task checklist

Status as of 2026-10-11: analysis and handoff documentation are complete;
static application implementation has not started.

## Analysis completed

- [x] Map ASP.NET controllers, services, caches, DTOs, and AniList calls.
- [x] Map React routes, views, controls, preferences, and rendering.
- [x] Record AniListNet submodule provenance and application usage.
- [x] Assess static GitHub Pages feasibility and behavior changes.

## Next implementation tasks

- [ ] Choose the static directory and GitHub Pages deployment strategy.
- [ ] Choose hash routing versus a `404.html` fallback.
- [ ] Implement the minimal direct AniList GraphQL client.
- [ ] Port server normalization into browser-side modules.
- [ ] Port the home/search/user/overview/three-month UI.
- [ ] Add loading, empty, GraphQL, rate-limit, CORS, and offline states.
- [ ] Verify external image/CDN behavior and AniList API response shape.
- [ ] Test pagination, filters, mobile interaction, deep links, and deployment.

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
