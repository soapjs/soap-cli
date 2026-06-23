# Guide: CQRS, Events, Kafka, And WebSockets

Use this path when the service should be event-oriented or needs WebSocket handlers.

## Create A CQRS Project

```bash
soap create operations-api \
  --architecture cqrs \
  --messaging kafka \
  --realtime ws \
  --auth jwt \
  --api-client bruno \
  --install
```

Interactive equivalent:

```bash
soap create operations-api -i
```

In interactive mode, select:

- architecture: `cqrs`
- messaging: `kafka`
- realtime: `ws`
- auth as needed
- API client as needed

Kafka support uses Redpanda in generated Docker Compose.

## Add A CQRS CRUD Resource

```bash
soap add feature shipment \
  --crud \
  --auth jwt \
  --zone private \
  --field trackingNumber:string \
  --field status:string
```

CQRS CRUD generation creates:

- commands for create/update/delete
- queries for get/list
- command/query handlers
- handler specs
- route controllers that dispatch through command/query buses
- entity and in-memory repository specs

## Add Commands And Queries Directly

```bash
soap add command dispatch-shipment --feature shipment
soap add query find-shipments --feature shipment
```

These commands require a CQRS project.

## Add Domain Events

```bash
soap add event shipment-dispatched --feature shipment
```

In CQRS projects, the CLI also generates an event handler placeholder under the feature API layer.

## Add WebSocket Handlers

```bash
soap add socket shipment-updates --feature shipment --auth jwt
```

WebSocket support must be enabled first:

```bash
soap update config --add-realtime ws
```

The socket command updates `src/config/sockets.ts` and adds a handler under the feature.

## Run With Docker Services

```bash
make up
make logs
make down
```

Generated Docker Compose includes the API and Redpanda when Kafka is enabled.

## Validate

```bash
npm test
soap check routes
```
