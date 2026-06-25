# SoapJS CLI Reference

This reference lists the main CLI commands and links to task-focused docs.

## Project Creation

- [`soap create`](create.md) creates a new SoapJS service.
- Use `--install` to install dependencies after generation.
- Use `--git-init` to initialize a local git repository. The CLI does not commit or push.
- Use `-i` for guided creation.

```bash
soap create users-api --db postgres --auth jwt --docs openapi --api-client bruno --install
soap create users-api -i
```

## Add Code

- [`soap add feature`](add-resource.md) adds a feature, optional CRUD routes, storage, contracts, tests, and Bruno requests.
- [`soap add controller`](add-controller.md) adds an empty mock controller to an existing feature.
- [`soap add route`](add-route.md) adds a custom route to an existing resource.

```bash
soap add feature invoice --crud --db postgres --auth jwt --zone private
soap add controller invoice-admin --feature invoice
soap add route invoice approve --method post --path :id/approve --auth jwt --policy custom:approver
```

Additional component commands:

```bash
soap add entity invoice --feature invoice
soap add use-case approve-invoice --feature invoice
soap add repository invoice --feature invoice --db postgres
soap add command approve-invoice --feature invoice
soap add query find-invoices --feature invoice
soap add event invoice-approved --feature invoice
soap add socket invoice-updates --feature invoice --auth jwt
```

## Generate API Artifacts

- [`soap generate bruno`](bruno.md) refreshes Bruno API requests from the route registry.
- `soap generate openapi` fetches the running app OpenAPI spec.

```bash
soap generate bruno
soap generate bruno --e2e
soap generate openapi --output openapi.json
```

## Update Project Capabilities

`soap update config` adds infrastructure after project creation.

```bash
soap update config --add-db mysql
soap update config --add-auth api-key
soap update config --add-docs openapi
soap update config --add-contracts zod
soap update config --add-api-client bruno
soap update config --add-realtime ws
soap update config --refresh
```

Updates are add-only. They do not remove existing capabilities.

## Validate And Inspect

```bash
soap info
soap doctor
soap check routes
```

- `info` prints project metadata.
- `doctor` validates the local `.soap` project structure.
- `check routes` validates route registry consistency, auth, zones, contracts, and Bruno files.

## Remove Generated Code

- [`soap remove`](remove.md) safely removes generated routes, features, or feature components tracked in `.soap/registry.json`.

```bash
soap remove route invoice create
soap remove feature invoice
soap remove controller invoice invoice-admin
soap remove repository invoice invoice --impl
soap remove feature invoice -i
```

## Interactive Mode

See [`interactive-mode.md`](interactive-mode.md).

Interactive mode resolves inputs only. It uses the same deterministic planners and file writer as flag-based commands.
