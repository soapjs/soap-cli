# Guide: Auth And Route Policies

SoapJS CLI supports project-level auth capabilities and route-level policies.

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

## Add Protected CRUD Routes

```bash
soap add resource report --crud --auth jwt --zone private
```

Admin zone:

```bash
soap add resource audit-log --crud --auth jwt --zone admin
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
soap add resource report --crud \
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

