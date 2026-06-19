# `soap add route`

Add a route to an existing resource.

```bash
soap add route invoice approve --method post --path approve --auth jwt --zone public
soap add route invoice approve --method post --path approve --auth jwt --policy custom:approver
soap add route invoice approve -i
soap add route -i
```

## Interactive Flow

```bash
soap add route -i
```

When arguments are omitted, interactive mode can select the resource from `.soap/registry.json` and ask for the route name.

Prompts cover:

- resource
- route name
- HTTP method
- route path
- API zone from project zones
- route auth from enabled project auth
- target: direct controller, use case, CQRS command, or CQRS query
- Bruno refresh when Bruno is enabled

CQRS command and query targets are only offered when the project architecture is `cqrs`.

## Non-Interactive Use

Without `-i`, both resource and route name are required:

```bash
soap add route invoice approve --method post --path approve
```

Target options are mutually exclusive:

```bash
--use-case approve-invoice
--command approve-invoice
--query find-invoices
```

Use only one target option.

## Auth Policies

Attach a policy to a protected route:

```bash
soap add route invoice approve --method post --path approve --auth jwt --policy roles:admin,editor
soap add route invoice approve --method post --path approve --auth api-key --policy admin
soap add route invoice approve --method post --path approve --auth jwt --policy custom:approver
```

Supported policies:

- `admin` -> `@AdminOnly('<strategy>')`
- `roles:a,b` -> `@Auth('<strategy>', { roles: ['a', 'b'] })`
- `custom:name` -> `@Auth('<strategy>', { policy: 'name' })`

Policies require route auth. `--auth none --policy ...` fails before writing files.

## Contracts

When the project has `contracts: ["zod"]`, generated route contracts parse input through Zod schemas.

## Bruno

Refresh Bruno after adding a route:

```bash
soap add route invoice approve --method post --path approve --bruno
```
