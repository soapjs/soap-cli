# `soap add feature`

Add a feature to an existing SoapJS project.

`soap add resource` is a deprecated compatibility alias for `soap add feature`.

```bash
soap add feature invoice --crud --db postgres --auth jwt --zone public
soap add feature invoice --crud --db mysql --auth jwt --zone private
soap add feature note --crud --db sqlite
soap add feature product --crud --field title:string --field price:number --field active:boolean:optional
soap add feature report --crud --auth jwt --policy roles:admin,editor
soap add feature invoice -i
```

## Interactive Flow

```bash
soap add feature invoice -i
```

The command reads `.soap` before prompting and only offers enabled project capabilities:

- CRUD generation
- storage from enabled databases plus `none`
- route auth from enabled auth strategies plus `none`
- API zone from project zones
- Bruno generation when Bruno is enabled
- enabling Bruno when it is not enabled
- optional dry-run-first preview

Interactive mode prints the expanded feature plan before writing and asks for confirmation.

Use `--yes` to skip final confirmation:

```bash
soap add feature invoice -i --yes
```

## Dry Run

```bash
soap add feature invoice --crud --db postgres --dry-run
```

Dry run prints the generated file groups without writing files.

## Fields

Store feature field metadata in `.soap/registry.json`:

```bash
soap add feature product --crud \
  --field title:string \
  --field price:number \
  --field active:boolean:optional
```

Supported field types:

- `string`
- `number`
- `boolean`
- `date`

Fields are used by generated entity props, Zod contracts when enabled, and Bruno request bodies. If no fields are provided, the generator uses `name:string`.

## Storage

Feature repositories are generated for:

- `none` -> in-memory repository
- `mongo` -> Mongo repository
- `postgres` -> SQL repository using PostgreSQL config
- `mysql` -> SQL repository using MySQL config
- `sqlite` -> SQL repository using SQLite config

`redis` is currently infrastructure-only and does not generate a feature repository adapter.

CRUD features with `mongo`, `postgres`, `mysql`, or `sqlite` also generate a feature seed module under `data/`. The project-level `src/config/database.ts` runner imports those modules and exposes:

```bash
npm run db:init
npm run db:seed
npm run db:reset
make db-init
make db-seed
make db-reset
```

For SQL features, `db:init` creates the generated table when it does not exist. `db:seed` runs init first and upserts sample data based on `--field` metadata. `db:reset` clears the generated feature table. For Mongo features, `db:seed` upserts sample documents by stable generated IDs and `db:reset` clears the feature collection.

## Auth Policies

Attach a policy to protected generated routes:

```bash
soap add feature report --crud --auth jwt --policy roles:admin,editor
soap add feature audit-log --crud --auth api-key --policy admin
soap add feature invoice --crud --auth jwt --policy custom:billing-owner
```

Supported policies:

- `admin` -> `@AdminOnly('<strategy>')`
- `roles:a,b` -> `@Auth('<strategy>', { roles: ['a', 'b'] })`
- `custom:name` -> `@Auth('<strategy>', { policy: 'name' })`

Policies require route auth. Use `--auth jwt` or `--auth api-key`.

## CRUD Route Matrix

Override per-operation route metadata:

```bash
soap add feature report --crud \
  --crud-route list:get:/search:jwt:private:admin:no-bruno \
  --crud-route create:post:/submit:jwt:private:roles=admin,editor:bruno \
  --crud-route update:patch:/:id:jwt:private:custom=report-owner:bruno
```

Format:

```txt
operation:method:path[:auth][:zone][:policy][:bruno|no-bruno]
```

Supported operations are `list`, `get`, `create`, `update`, and `delete`. Paths are relative to the feature base unless they already start with the feature path. Matrix policies use `admin`, `roles=a,b`, or `custom=name`. `no-bruno` excludes the operation from generated Bruno requests.

## Contracts

When the project has `contracts: ["zod"]`, generated feature route contracts parse input through Zod schemas.

## Bruno

If Bruno is enabled, feature generation refreshes the Bruno collection.

If Bruno is disabled, interactive mode can enable it. Non-interactive mode can do the same explicitly:

```bash
soap add feature invoice --enable-bruno --bruno
```
