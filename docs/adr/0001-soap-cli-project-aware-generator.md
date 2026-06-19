# ADR 0001: Soap CLI Project-Aware Generator

## Status

Accepted

## Context

SoapJS CLI generates service projects and later modifies them by adding resources, routes, API clients, documentation, auth, and infrastructure capabilities. The generator has to be repeatable, safe around user edits, and explicit about which files it owns.

The MVP intentionally targets predictable project shapes instead of arbitrary existing codebases.

## Decision

SoapJS CLI is a template-based, project-aware generator.

Generated projects include a `.soap` directory:

- `.soap/project.json` stores selected capabilities and project metadata.
- `.soap/structure.json` stores source layout conventions.
- `.soap/api.json` stores API runtime settings used by generators.
- `.soap/registry.json` stores resources, routes, generated files, owners, and hashes.

The registry is the authority for follow-up commands such as `soap add`, `soap generate`, `soap check`, `soap remove`, and `soap update config`.

## Why `.soap` Exists

The CLI needs project-local state that is independent of package manager files and source code formatting. `.soap` gives commands a stable contract for:

- enabled capabilities
- expected project structure
- API conventions
- generated resource and route metadata
- generated file ownership and hashes

This avoids guessing project state from source files.

## Why The Registry Exists

The registry makes generated changes deterministic and safe.

It records:

- generated resources and route paths
- generated file paths
- generated file type and owner
- content hashes from the last CLI write

This allows the CLI to detect manual edits and skip, overwrite, or write `.new` files depending on command options.

Without a registry, commands like `soap remove resource users` would have to infer ownership from filenames and could delete user-owned files.

## Why The MVP Avoids Broad AST Mutation

AST mutation is useful when editing arbitrary source code, but it increases complexity and risk:

- user formatting and local patterns vary
- imports and decorators can be organized many ways
- partial edits can leave code in a hard-to-debug state
- reliable idempotence requires many language-aware edge cases

The MVP instead regenerates known composition files and generated artifacts from templates. This keeps behavior predictable and makes safety checks based on registry hashes straightforward.

Future versions can add narrow AST transforms where there is a clear contract and test coverage.

## Why Bruno Is Generated

Bruno collections are generated from the route registry so API test artifacts stay aligned with generated routes.

This gives every generated project a runnable local API smoke path:

- health check
- auth requests when auth is enabled
- resource CRUD requests
- optional E2E CRUD flow

Because Bruno files are tracked in the registry, user edits are protected by the same hash-based safety behavior as TypeScript files.

## Why Optional Adapters Are Wired In The Composition Root

Optional adapters such as Mongo, Postgres, Kafka, OpenAPI, auth, and WebSocket support are wired in generated composition files:

- `src/index.ts`
- `src/config/config.ts`
- `src/config/dependencies.ts`
- `src/config/controllers.ts`
- `src/config/resources.ts`

This keeps feature code focused on domain/application concerns and keeps infrastructure selection in one predictable layer.

It also makes `soap update config` practical: adding a capability rewrites known infrastructure files and adds missing adapter files without invasive edits across resource code.

## Consequences

Positive:

- deterministic generated output
- safer overwrite/remove behavior
- simple validation through `soap check routes`
- straightforward generated project structure
- capability updates are practical in the MVP

Tradeoffs:

- arbitrary app migrations are out of scope
- manually rewritten composition files may be skipped unless `--force` is used
- the CLI favors project conventions over flexible source discovery
- some future changes may require explicit migration commands
