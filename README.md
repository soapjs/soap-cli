# SoapJS CLI

Deterministic project and code generator for SoapJS services.

The CLI creates a runnable TypeScript service, records generated artifacts in `.soap`, and can add features, routes, API clients, OpenAPI docs, auth, databases, messaging, and realtime support without relying on interactive prompts.

## Installation

Requirements:

- Node.js `>=24.17.0` (Node 24 LTS or newer)
- Generated projects include `.nvmrc` with `24.17.0`

```bash
npm install -g @soapjs/cli
soap --help
```

For local development inside this repository:

```bash
npm install
npm run build
node build/index.js --help
```

## Quick Start

```bash
soap create users-api \
  --db postgres \
  --auth jwt \
  --docs openapi \
  --api-client bruno \
  --skip-install

cd users-api
npm install
npm run build
npm start
```

In another terminal:

```bash
curl http://localhost:3000/health
soap info
soap doctor
soap check routes
```

## Interactive Mode

Supported commands accept `-i` for guided prompts:

```bash
soap create users-api -i
soap add feature invoice -i
soap add route invoice approve -i
soap generate bruno -i
soap remove route invoice approve -i
```

Interactive mode requires a TTY and uses the same deterministic planners as the flag-based CLI. Use `--yes` to skip final confirmation prompts where supported.

Detailed docs:

- [CLI reference](docs/cli/index.md)
- [Interactive mode](docs/cli/interactive-mode.md)
- [Create](docs/cli/create.md)
- [Add feature](docs/cli/add-resource.md)
- [Add route](docs/cli/add-route.md)
- [Bruno](docs/cli/bruno.md)
- [Remove](docs/cli/remove.md)

Developer guides:

- [Developer guides index](docs/guides/index.md)
- [Regular CRUD API](docs/guides/regular-api.md)
- [CQRS, events, Kafka, and WebSockets](docs/guides/cqrs-events-realtime.md)
- [Auth and route policies](docs/guides/auth.md)
- [Storage capabilities](docs/guides/storage.md)
- [Quality, tests, and safe changes](docs/guides/quality-and-safety.md)

## `soap create`

`soap create` bootstraps a new service.

```bash
soap create users-api --skip-install
soap create users-api --install
soap create users-api --git-init --skip-install
soap create users-api --db mongo --auth api-key --api-client bruno --skip-install
soap create users-api --db mysql --db sqlite --skip-install
soap create users-api --architecture cqrs --messaging kafka --realtime ws --skip-install
```

Common options:

- `--architecture regular|cqrs`
- `--db mongo|postgres|mysql|sqlite|redis|none`
- `--auth jwt|api-key|local|none`
- `--messaging in-memory|kafka|none`
- `--telemetry logs|otel-noop|metrics|memory|none`
- `--docs openapi|none`
- `--contracts zod|none`
- `--api-client bruno|none`
- `--realtime ws|none`
- `--zones public,private,admin`
- `--package-manager npm|pnpm|yarn|bun`
- `--install` to install dependencies after generation
- `--git-init` to initialize a local git repository without committing or pushing
- `--force` and `--write-new` for generated file conflicts

Generated projects use `@soapjs/soap-auth` 1.x with `SoapAuth.create(...)` and the `@soapjs/soap-express/auth` router/middleware helpers. Security defaults are generated through soap-express security config, including disabled `x-powered-by`, trust proxy, helmet, cors, and auth route throttling when auth is enabled.

## `soap add feature`

Add a feature to an existing SoapJS project. `soap add resource` remains available as a deprecated compatibility alias.

```bash
soap add feature user --crud
soap add feature invoice --crud --db postgres --auth jwt --zone private
soap add feature invoice --crud --db mysql --auth jwt --zone private
soap add feature note --crud --db sqlite
soap add feature audit-log --db mongo --zone admin
soap add feature product --crud --field title:string --field price:number --field active:boolean:optional
soap add feature report --crud --auth jwt --policy roles:admin,editor
soap add feature report --crud --crud-route list:get:/search:jwt:private:admin:no-bruno
```

Use `--dry-run` to inspect the expanded plan before writing:

```bash
soap add feature order --crud --db postgres --dry-run
soap add feature order --crud --db postgres --yes
```

CRUD features generate domain, repository, use-case or CQRS files, route controllers, route contracts, registry entries, and Bruno requests when Bruno is enabled.

Use `--field name:type` to store feature field metadata in the registry. Supported field types are `string`, `number`, `boolean`, and `date`. Add `:optional` to make a field optional.

Use `--policy admin`, `--policy roles:a,b`, or `--policy custom:name` to attach an auth policy to generated protected routes. Policies require route auth.

Use `--crud-route operation:method:path[:auth][:zone][:policy][:bruno|no-bruno]` to override CRUD route metadata per operation. Supported operations are `list`, `get`, `create`, `update`, and `delete`. Matrix policies use `admin`, `roles=a,b`, or `custom=name`.

## `soap add route`

Add a route to an existing resource:

```bash
soap add route users export --method get --path export
soap add route users activate-user --method post --path :id/activate --auth jwt --zone private
soap add route users approve --method post --path :id/approve --auth jwt --policy custom:approver
soap add route users rebuild --method post --command rebuild-user
soap add route users search --method get --query search-users
```

The route path must stay under the resource path. Route names and resource names are normalized to kebab-case in the registry. `--policy` supports `admin`, `roles:a,b`, `custom:name`, and `none`.

## Bruno

Enable Bruno at project creation:

```bash
soap create users-api --api-client bruno --skip-install
```

Or add it later:

```bash
soap update config --add-api-client bruno
soap generate bruno
```

Generated collection structure:

```txt
bruno/
  bruno.json
  environments/Local.bru
  Health/health.bru
  <Resource>/<Request>.bru
```

Run API tests:

```bash
npm run bruno
npm run test:api
make bruno
make test-api
```

Generate a CRUD E2E flow:

```bash
soap generate bruno --e2e
npm run bruno
```

Bruno generation is registry-driven. Modified `.bru` files are skipped by default; use `--force` to overwrite or `--write-new` to write `.new` files.

## OpenAPI

Enable OpenAPI at project creation:

```bash
soap create users-api --docs openapi --skip-install
```

Or add it later:

```bash
soap update config --add-docs openapi
```

When the app is running, fetch the generated spec:

```bash
soap generate openapi
soap generate openapi --output openapi.json
```

The generated app exposes:

- `/docs`
- `/openapi.json`

## Docker Flow

Generated projects include `Dockerfile`, `docker-compose.yml`, and `Makefile`.

```bash
make up
make logs
curl http://localhost:3000/health
make down
make down-clean
```

Selected capabilities update Docker services. For example, Redis adds a `redis` service and `REDIS_URL`, Postgres adds a `postgres` service and volume, MySQL adds a `mysql` service and volume, SQLite adds `SQLITE_FILENAME`, and Kafka adds Redpanda.

## `.soap` Folder

Every generated project includes:

```txt
.soap/
  project.json
  structure.json
  api.json
  registry.json
```

- `project.json` stores project metadata and selected capabilities.
- `structure.json` stores source layout conventions.
- `api.json` stores API-level settings such as base URL, health path, auth defaults, and Bruno config.
- `registry.json` stores resources, routes, and generated file hashes.

The registry is what makes later commands deterministic and safe.

## Generated Architecture

Default layout:

```txt
src/
  index.ts
  config/
    config.ts
    controllers.ts
    dependencies.ts
    resources.ts
  common/
  features/
    <resource>/
      domain/
      application/
      data/
      api/
      contracts/
```

Generated code keeps optional adapters in the composition root:

- database clients in `src/config/dependencies.ts`
- controllers in `src/config/controllers.ts`
- resource registration in `src/config/resources.ts`
- OpenAPI plugin in `src/index.ts`
- auth strategies in `src/features/auth`

## Capabilities

Supported MVP capabilities:

- Framework: `express`
- Architecture: `regular`, `cqrs`
- Databases: `mongo`, `postgres`, `mysql`, `sqlite`, `redis`
- Auth: `jwt`, `api-key`, `local`
- Messaging: `in-memory`, `kafka`
- Realtime: `ws`
- Telemetry: `logs`, `otel-noop`
- Docs: `openapi`
- Contracts: `zod`
- API client: `bruno`

Add capabilities after project creation:

```bash
soap update config --add-db redis
soap update config --add-db mysql
soap update config --add-auth api-key
soap update config --add-docs openapi
soap update config --add-contracts zod
soap update config --add-api-client bruno
```

## Safety and Overwrite Behavior

The CLI tracks generated file hashes in `.soap/registry.json`.

Default behavior:

- Existing unmodified generated files can be updated.
- Manually modified generated files are skipped.
- `--force` overwrites or deletes modified generated files.
- `--write-new` writes a `.new` file for supported generators.
- `--dry-run` prints planned writes/deletes without changing files.

Safe removal:

```bash
soap remove route users create-user
soap remove resource users
soap remove route users create-user --force
```

`soap remove` only deletes files tracked in the registry. If a target file was manually modified, the operation is skipped unless `--force` is used.

## Validation

```bash
soap info
soap doctor
soap check routes
```

`soap check routes` verifies route uniqueness, zones, auth strategies, contracts, and Bruno request files when Bruno is enabled.

## MVP Limitations

- Only the Express adapter is supported.
- The generator is template-based; it does not perform broad AST mutation of user-edited app code.
- Dependency installation is explicit. Use `--install` or answer yes in interactive mode.
- Git initialization is explicit. Use `--git-init`; the CLI does not commit or push.
- Update commands are add-only for capabilities.
- Redis is currently wired as dependency/config/Docker capability; resource repositories are implemented for memory, Mongo, Postgres, MySQL, and SQLite paths.
- Generated code is intended as a clean starting point and integration surface, not as a migration engine for arbitrary existing apps.

## License

MIT
