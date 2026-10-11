# AniList Visualizer rewrite work-in-progress

Last reviewed: 2026-10-11

This directory is the persistent handoff for the rewrite from ASP.NET Core +
React to a static vanilla HTML/CSS/JS site for GitHub Pages.

## Current source

- Main repository: `bigchunguspng/anilist-visualizer`
- Current branch/commit: `static` / `65347aa`
- Backend: `src/API` (`net7.0` ASP.NET Core)
- Frontend: `src/app-react` (React 18, `react-router-dom`)
- AniList library: `src/AniListNet` (git submodule, fork hosted at
  `bigchunguspng/AniListNet`)
- React source is also a git submodule at
  `bigchunguspng/anilist-visualizer-react`

## Documents

- `architecture.md` - current behavior, request flow, data contracts, and UI
- `fork.md` - AniListNet provenance and the application-specific fork usage
- `static-feasibility.md` - feasibility conclusion and behavior changes
- `migration-plan.md` - proposed implementation sequence and risks
- `todo.md` - persistent task checklist for the next agent

## Scope of this review

This review describes the code currently pinned in the parent repository. It
does not implement the rewrite.
