# SoapJS CLI Developer Guides

Use these guides when building a service with SoapJS CLI.

SoapJS CLI and generated projects require Node.js `>=24.17.0` (Node 24 LTS or newer).
Generated projects include `.nvmrc` with `24.17.0`.

## Start Here

- [Regular CRUD API](regular-api.md): create a standard Express CRUD API with storage, auth, contracts, tests, Bruno, and OpenAPI.
- [CQRS, events, Kafka, and WebSockets](cqrs-events-realtime.md): create a CQRS/event-oriented service and add realtime handlers.

## Capability Guides

- [Auth and route policies](auth.md): JWT, API key, local auth, admin/roles/custom route policies.
- [Storage capabilities](storage.md): Mongo, Postgres, MySQL, SQLite, Redis, Docker, and environment variables.

## Operations

- [Quality, tests, and safe changes](quality-and-safety.md): generated tests, validation commands, dry-runs, conflict policies, remove safety, install, and git init.

## Command Reference

See [CLI reference](../cli/index.md) for command-level docs.
