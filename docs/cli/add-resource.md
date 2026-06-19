# `soap add resource`

Add a resource to an existing SoapJS project.

```bash
soap add resource invoice --crud --db postgres --auth jwt --zone public
soap add resource invoice --crud --db mysql --auth jwt --zone private
soap add resource note --crud --db sqlite
soap add resource product --crud --field title:string --field price:number --field active:boolean:optional
soap add resource report --crud --auth jwt --policy roles:admin,editor
soap add resource invoice -i
```

## Interactive Flow

```bash
soap add resource invoice -i
```

The command reads `.soap` before prompting and only offers enabled project capabilities:

- CRUD generation
- storage from enabled databases plus `none`
- route auth from enabled auth strategies plus `none`
- API zone from project zones
- Bruno generation when Bruno is enabled
- enabling Bruno when it is not enabled
- optional dry-run-first preview

Interactive mode prints the expanded resource plan before writing and asks for confirmation.

Use `--yes` to skip final confirmation:

```bash
soap add resource invoice -i --yes
```

## Dry Run

```bash
soap add resource invoice --crud --db postgres --dry-run
```

Dry run prints the generated file groups without writing files.

## Fields

Store resource field metadata in `.soap/registry.json`:

```bash
soap add resource product --crud \
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

Resource repositories are generated for:

- `none` -> in-memory repository
- `mongo` -> Mongo repository
- `postgres` -> SQL repository using PostgreSQL config
- `mysql` -> SQL repository using MySQL config
- `sqlite` -> SQL repository using SQLite config

`redis` is currently infrastructure-only and does not generate a resource repository adapter.

## Auth Policies

Attach a policy to protected generated routes:

```bash
soap add resource report --crud --auth jwt --policy roles:admin,editor
soap add resource audit-log --crud --auth api-key --policy admin
soap add resource invoice --crud --auth jwt --policy custom:billing-owner
```

Supported policies:

- `admin` -> `@AdminOnly('<strategy>')`
- `roles:a,b` -> `@Auth('<strategy>', { roles: ['a', 'b'] })`
- `custom:name` -> `@Auth('<strategy>', { policy: 'name' })`

Policies require route auth. Use `--auth jwt` or `--auth api-key`.

## CRUD Route Matrix

Override per-operation route metadata:

```bash
soap add resource report --crud \
  --crud-route list:get:/search:jwt:private:admin:no-bruno \
  --crud-route create:post:/submit:jwt:private:roles=admin,editor:bruno \
  --crud-route update:patch:/:id:jwt:private:custom=report-owner:bruno
```

Format:

```txt
operation:method:path[:auth][:zone][:policy][:bruno|no-bruno]
```

Supported operations are `list`, `get`, `create`, `update`, and `delete`. Paths are relative to the resource base unless they already start with the resource path. Matrix policies use `admin`, `roles=a,b`, or `custom=name`. `no-bruno` excludes the operation from generated Bruno requests.

## Contracts

When the project has `contracts: ["zod"]`, generated resource route contracts parse input through Zod schemas.

## Bruno

If Bruno is enabled, resource generation refreshes the Bruno collection.

If Bruno is disabled, interactive mode can enable it. Non-interactive mode can do the same explicitly:

```bash
soap add resource invoice --enable-bruno --bruno
```
