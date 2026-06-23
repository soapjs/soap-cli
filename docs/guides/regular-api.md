# Guide: Regular CRUD API

Use this path for a conventional Express service with generated CRUD routes, storage, route contracts, tests, Bruno, and OpenAPI.

## Create The Project

```bash
soap create billing-api \
  --db postgres \
  --auth jwt \
  --docs openapi \
  --contracts zod \
  --api-client bruno \
  --install \
  --git-init
```

Interactive equivalent:

```bash
soap create billing-api -i
```

In interactive mode, select:

- architecture: `regular`
- database: `postgres`
- auth: `jwt`
- docs: `openapi`
- contracts: `zod`
- API client: `bruno`
- install dependencies: yes when wanted
- git init: yes only when you want a new local repository

## Run The Service

```bash
cd billing-api
npm run build
npm test
npm start
```

Health check:

```bash
curl http://localhost:3000/health
```

## Add A CRUD Resource

```bash
soap add feature invoice \
  --crud \
  --db postgres \
  --auth jwt \
  --zone private \
  --field number:string \
  --field total:number \
  --field paid:boolean:optional \
  --bruno
```

Generated output includes:

- domain entity and entity spec
- repository port
- in-memory repository and repository spec
- Postgres SQL repository
- CRUD use-cases and use-case specs
- route contracts
- route controllers
- resource setup registration
- Bruno requests when Bruno is enabled

## Add A Custom Route

```bash
soap add route invoice approve \
  --method post \
  --path :id/approve \
  --auth jwt \
  --zone private \
  --policy custom:invoice-approver \
  --bruno
```

Route paths are scoped under the resource path. The example generates `/invoices/:id/approve`.

## Validate Generated Metadata

```bash
soap info
soap doctor
soap check routes
```

Run these after adding or removing resources/routes.

## Refresh API Artifacts

```bash
soap generate bruno
soap generate bruno --e2e
soap generate openapi --output openapi.json
```

`generate openapi` expects the service to be running.

## Safe Removal

```bash
soap remove route invoice approve
soap remove resource invoice --dry-run
soap remove resource invoice
```

Modified generated files are skipped unless you use `--force` or `--on-conflict overwrite`.
