# Bruno

Bruno generation is driven by `.soap/registry.json`.

Enable Bruno at project creation:

```bash
soap create users-api --api-client bruno --skip-install
```

Enable it later:

```bash
soap update config --add-api-client bruno
soap generate bruno
```

## Interactive Generation

```bash
soap generate bruno -i
```

Interactive mode analyzes the current collection before writing:

- detected routes
- existing Bruno files
- missing Bruno files
- modified generated Bruno files

Then choose:

- generate missing only
- regenerate all unmodified generated files
- generate E2E flow
- abort

Manual `.bru` edits are detected from the registry hash and are skipped unless you use `--force`.

## E2E Flow

```bash
soap generate bruno --e2e
soap generate bruno -i
```

E2E files are generated for resources with complete CRUD routes.

## Overwrite Behavior

```bash
soap generate bruno --force
soap generate bruno --write-new
soap generate bruno --on-conflict skip
```

Default behavior skips modified generated files.

