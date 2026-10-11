# Static Rewrite Rules

These rules apply to every future rewrite task and are part of the persistent
handoff between agents.

## Data persistence

- Replace the original cookie-based preferences with browser storage:
  prefer `localStorage` for durable user preferences, and use `sessionStorage`,
  IndexedDB, or another suitable option when the data is session-scoped or
  too large for simple key/value storage.
- Do not introduce authentication or store secrets in the static application.

## Source preservation

- Do not delete, overwrite, or remove original ASP.NET, React, or other source
  files while porting behavior.
- Original files may be deleted manually by the project owner after the rewrite
  is complete.

## External images

- Keep using the existing Imgur image URLs for now.
- The project owner will replace those URLs with local image files later.

## Naming and formatting

- Prefer `snake_case`, `SCREAMING_SNAKE_CASE`, or
  `snake_with_ACRONYMS` over camelCase and PascalCase for element IDs,
  variables, constants, function names, and similar identifiers.
- Use `kebab-case` for CSS class names.
- Indent every file type with 4 spaces.
- Use table indentation for groups of similar lines, such as switch/if
  branches, element lookups, and HTML tables.
- Avoid excessive empty lines after functions or code blocks.
- Use ALL CAPS comments for navigation markers and region names.
- Keep performance in mind; prefer pragmatic, readable, maintainable code over
  unnecessary abstraction.
