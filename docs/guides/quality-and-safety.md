# Guide: Quality, Tests, And Safe Changes

SoapJS CLI is registry-aware. Generated files are tracked in `.soap/registry.json` with hashes so later commands can avoid overwriting user edits.

## Generated Tests

CRUD resource generation creates compiling Node test files.

Regular CRUD resources generate:

- entity spec
- in-memory repository CRUD spec
- use-case specs for list/get/create/update/delete

CQRS CRUD resources generate:

- command handler specs
- query handler specs
- entity spec
- in-memory repository CRUD spec

Run tests:

```bash
npm test
```

The generated `test` script builds first, then runs compiled `.spec.js` and `.test.js` files with `node --test`.

## Validation Commands

```bash
soap info
soap doctor
soap check routes
```

Use these commands after changing capabilities, adding routes, or removing generated code.

## Dry Runs

Use `--dry-run` before risky writes or deletes.

```bash
soap add feature invoice --crud --dry-run
soap remove resource invoice --dry-run
soap update config --add-db mysql --dry-run
```

## Conflict Policies

Generated files are safe by default:

- unchanged generated files can be updated
- modified generated files are skipped
- `--force` overwrites or deletes modified generated files
- `--write-new` writes a `.new` file where supported
- `--on-conflict abort` fails on the first conflict

Examples:

```bash
soap generate bruno --write-new
soap remove resource invoice --force
soap add feature invoice --crud --on-conflict abort
```

## Remove Generated Code

```bash
soap remove route invoice create
soap remove resource invoice
soap remove resource invoice -i
```

Remove only touches files tracked in the registry. If a generated file was modified, it is skipped unless you explicitly force deletion.

## Git And Install

Dependency installation and Git initialization are explicit.

```bash
soap create users-api --install
soap create users-api --git-init --skip-install
```

`--git-init` only runs `git init`. It does not commit or push.
