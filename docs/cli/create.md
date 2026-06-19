# `soap create`

Create a new SoapJS project.

Generated projects require Node.js `>=24.17.0` (Node 24 LTS or newer).
The generator writes `.nvmrc` with `24.17.0` so `nvm use` selects the supported runtime.

```bash
soap create users-api --skip-install
soap create users-api --install
soap create users-api --git-init --skip-install
soap create users-api -i
soap create users-api --preset express-postgres-api --skip-install
soap create users-api --db mysql --db sqlite --skip-install
```

## Interactive Flow

```bash
soap create users-api -i
```

Prompts cover the supported MVP capabilities:

- framework
- architecture
- databases
- auth
- messaging
- realtime
- telemetry
- OpenAPI docs
- contracts
- Bruno API client
- API zones
- package manager
- dependency install intent
- git init intent

Before writing files, interactive mode prints a project summary and asks for confirmation.

Use `--yes` to skip the final confirmation:

```bash
soap create users-api -i --yes
```

## Presets

Available presets:

- `express-mongo-api`
- `express-postgres-api`
- `express-cqrs-kafka-api`
- `express-full-demo`

Examples:

```bash
soap create users-api --preset express-mongo-api --skip-install
soap create users-api -i --preset express-full-demo
```

In interactive mode, preset values become prompt defaults. Explicit CLI flags still override prompt answers and preset defaults.

## Notes

- Only `express` is currently supported.
- `--contracts zod` enables generated contracts backed by Zod.
- Database capabilities include `mongo`, `postgres`, `mysql`, `sqlite`, and `redis`. Resource repositories are generated for Mongo and SQL adapters; Redis is infrastructure-only for now.
- `--install` runs the selected package manager after files are written. `--skip-install` always skips installation.
- `--git-init` runs `git init` after files are written. It does not commit or push.
- `--dry-run` prints the planned file count and planned writes.
