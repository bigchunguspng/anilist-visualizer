# Static GitHub Pages feasibility

## Conclusion

The rewrite is feasible and is a good fit for a static site. The current
application reads public AniList data only; it has no database, server-side
identity, secret, login flow, or write operation. HTML, CSS, and browser
JavaScript can reproduce the current UI and call AniList's GraphQL endpoint
directly.

The static site should use a small browser-side GraphQL client rather than
trying to compile the C# library. It can request only the fields currently
used by the visualizer, then perform the existing list merge, relation
grouping, date repair, timeline calculations, and activity aggregation in
JavaScript.

## Changes from the current system

### Removed

- ASP.NET Core hosting and .NET 7 runtime;
- the separate API deployment and hard-coded LAN API URL;
- AniListNet as a runtime dependency;
- server memory caches and response-cache attributes;
- backend DTO serialization and controller error mapping;
- React, React Router, npm runtime/build dependency.

### Added or moved into the browser

- direct `fetch` calls to `https://graphql.anilist.co`;
- GraphQL query strings or a small query builder;
- pagination loops and rate-limit/error handling;
- all current C# normalization and timeline calculations;
- client-side state for selected user, view, filters, language, grouping,
  ordering, loading, and errors;
- a static route strategy for `/` and `/user/{username}`.

### Behavior and operational differences

1. **AniList availability and CORS**: the browser depends directly on
   AniList accepting cross-origin requests. If AniList changes CORS policy,
   the static app cannot repair it without a proxy/server.
2. **Rate limits**: each visitor consumes AniList API quota directly. The
   current backend shares process-local cached results; the static app should
   use in-memory and optionally `sessionStorage` caching to reduce duplicate
   requests, but it cannot provide shared caching.
3. **Data freshness**: cache lifetime becomes per browser tab/session rather
   than centrally controlled.
4. **Deep links**: GitHub Pages serves files, not arbitrary SPA routes.
   Either use hash URLs (`#/user/name`), keep navigation at one document and
   parse `location.pathname` with a Pages fallback workaround, or add a
   `404.html` SPA fallback. Hash routing is the most reliable no-server
   option.
5. **Security**: public reads need no secret. An AniList personal token must
   not be embedded in the static bundle.
6. **Error UX**: failures will be browser-visible network/API errors rather
   than API-generated `400`/`404` responses. The client should distinguish
   no user, GraphQL errors, rate limiting, and offline/CORS failures.
7. **External assets**: images still come from AniList's CDN and existing
   Imgur URLs unless they are copied into the repository. Those external
   dependencies can disappear or be blocked independently of GitHub Pages.

## Recommended static shape

Use one root-level `index.html`, one or more CSS files, and ES modules. Keep a
data layer separate from rendering:

- `anilist-client.js`: GraphQL requests and pagination;
- `normalization.js`: status fetch, relation grouping, date/activity logic;
- `state.js`: URL, filters, preferences, cache, and view state;
- `render.js`: search, user header, overview rows, and 3-month chart;
- `main.js`: event delegation, route parsing, and startup.

The rewrite can preserve the current URL semantics through hash routing or
provide a `404.html` fallback. It should also replace React's HTML injection
for tooltip content with DOM text nodes/templates where possible.
