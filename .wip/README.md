# AniList Visualizer rewrite handoff

Last reviewed: 2026-10-11

This directory is the persistent handoff for rewriting the ASP.NET Core + React
application as a static vanilla HTML/CSS/JS site hosted on GitHub Pages. Phase 1
has established the static shell; AniList data access and visualizations remain.

## Current repository state

- Repository: `bigchunguspng/anilist-visualizer`
- Branch and commit: `static` / `6f64181`
- Backend source: `src/API` (`net7.0` ASP.NET Core)
- Frontend source: `src/app-react` (React 18 and `react-router-dom` submodule)
- AniList library: `src/AniListNet` (fork submodule,
  `bigchunguspng/AniListNet`, commit `47c4e6a`)
- React submodule commit: `9ef269c`
- Static app: `static` (vanilla HTML/CSS/ES module JavaScript).
- GitHub Pages publishing source: the `static` directory, deployed by the
  eventual Pages workflow.
- Routing: hash URLs (`#/` and `#/user/{username}`); `static/404.html` is a
  fallback for direct file-server misses.

## Document map

Use each document for one purpose; do not copy its content into another file.

| File | Source of truth for |
| --- | --- |
| `architecture.md` | Existing behavior, routes, data flow, contracts, and UI |
| `fork.md` | AniListNet provenance and the subset used by this application |
| `static-feasibility.md` | Static-hosting decision and known operational differences |
| `migration-plan.md` | Ordered implementation phases and preserved behavior decisions |
| `todo.md` | Current work queue and handoff status |
| `rewrite-rules.md` | Constraints and conventions for all new rewrite code |

## Handoff workflow

1. Read this file, `todo.md`, and the relevant source-of-truth document before
   editing code.
2. Mark the checklist item being worked on in `todo.md`.
3. Update `migration-plan.md` only when the implementation sequence or a
   deliberate behavior decision changes.
4. Record newly discovered behavior in `architecture.md`; record constraints
   in `rewrite-rules.md` instead of duplicating them in the checklist.
5. At the end of a task, update `todo.md` and this index's review date and
   repository commit.

The original ASP.NET, React, and submodule sources remain reference material
and must not be removed as part of the rewrite. The rewrite-wide constraints
are maintained only in `rewrite-rules.md`.

## Phase 1 implementation

`static/index.html` loads `styles.css` and `main.js` without a package manager
or build step. The shell currently renders the home search form, a user loading
screen, a custom not-found screen, and the shared footer. Submitting a non-empty
username navigates to its hash user route; it does not call AniList until Phase
2 adds the GraphQL client.
