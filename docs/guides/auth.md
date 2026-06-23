# Guide: Auth And Route Policies

SoapJS CLI supports project-level auth capabilities and route-level policies.
Generated auth bootstrap is based on `@soapjs/soap-auth` 1.x recipe configs and `@soapjs/soap-express/auth` helpers. The CLI registers `SoapAuth.create(...)` with the Express app and exposes generated auth routes through `createAuthRouter(...)`.

## Enable Auth

At project creation:

```bash
soap create secure-api --auth jwt --auth api-key --skip-install
```

After project creation:

```bash
soap update config --add-auth jwt
soap update config --add-auth api-key
```

Supported auth capabilities:

- `jwt`
- `api-key`
- `local`

For routes, `local` is normalized to `jwt`.

JWT projects include a local development login strategy so `/auth/login` can issue JWT access and refresh tokens. API key projects use `createApiKeyAuthConfig(...)` with a development `retrieveUserByApiKey` implementation. Generated `.env.example` includes `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and API key variables when relevant.

Auth projects also enable route-specific throttling for:

- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/oauth/:provider/callback`

## Add Protected CRUD Routes

```bash
soap add feature report --crud --auth jwt --zone private
```

Admin zone:

```bash
soap add feature audit-log --crud --auth jwt --zone admin
```

Public route:

```bash
soap add route report summary --method get --path summary --auth none --zone public
```

## Add Policies

Policies require route auth.

```bash
soap add route report approve --method post --path approve --auth jwt --policy roles:admin,editor
soap add route report purge --method delete --path purge --auth api-key --policy admin
soap add route report export --method post --path export --auth jwt --policy custom:report-exporter
```

Generated decorators:

- `admin` -> `@AdminOnly('<strategy>')`
- `roles:a,b` -> `@Auth('<strategy>', { roles: ['a', 'b'] })`
- `custom:name` -> `@Auth('<strategy>', { policy: 'name' })`

Invalid:

```bash
soap add route report approve --auth none --policy admin
```

The CLI fails before writing files because policies require auth.

## CRUD Route Matrix Policies

Use matrix policies when each CRUD operation needs different auth.

```bash
soap add feature report --crud \
  --crud-route list:get:/search:jwt:private:roles=admin,editor:bruno \
  --crud-route create:post:/submit:api-key:private:custom=report-writer:bruno \
  --crud-route delete:delete:/:id:jwt:admin:admin:no-bruno
```

Matrix policy syntax uses `roles=...` and `custom=...` because `:` separates matrix fields.

## Validate Auth Metadata

```bash
soap check routes
```

This checks unknown auth strategies, disabled auth capabilities, invalid zones, policy-without-auth, contracts, and Bruno files.
