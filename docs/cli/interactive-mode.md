# Interactive Mode

Interactive mode is a guided input layer for the same deterministic generators used by the flag-based CLI.

Use `-i` or `--interactive` on supported commands:

```bash
soap create users-api -i
soap add feature invoice -i
soap add route invoice approve -i
soap generate bruno -i
soap remove route invoice approve -i
soap remove feature invoice -i
```

Interactive mode requires a TTY. In CI and scripts, use explicit flags instead.

## Supported Commands

- `soap create <name> -i`
- `soap add feature <name> -i`
- `soap add route [resource] [name] -i`
- `soap generate bruno -i`
- `soap remove route <resource> <route> -i`
- `soap remove feature <feature> -i`

## When To Use It

Use interactive mode when exploring project capabilities or when adding resources manually during local development. Use explicit flags in scripts, CI, project templates, and documentation examples that should be reproducible.

The scenario guides can be followed either with flags or with `-i`:

- [Regular CRUD API](../guides/regular-api.md)
- [CQRS, events, Kafka, and WebSockets](../guides/cqrs-events-realtime.md)
- [Auth and route policies](../guides/auth.md)
- [Storage capabilities](../guides/storage.md)
- [Quality, tests, and safe changes](../guides/quality-and-safety.md)

## Safety Rules

- Prompts only resolve command options; planners and writers stay deterministic.
- The CLI reads `.soap` before project-aware prompts.
- Interactive choices are limited to capabilities enabled in `.soap/project.json`.
- Modified generated files are not overwritten or deleted unless you use `--force` or `--on-conflict overwrite`.
- `--yes` skips final confirmation prompts where supported.
- `--dry-run` prints planned writes/deletes without changing files.

## Conflict Policy

Most write commands support:

```bash
--on-conflict skip
--on-conflict overwrite
--on-conflict new
--on-conflict abort
```

`ask` is reserved by the shared policy but per-file interactive conflict resolution is not implemented yet.

Remove commands do not support `new`, because deletion cannot be written as a `.new` file.
