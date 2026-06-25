# `soap remove`

Safely remove generated routes, features, and feature components.

`soap remove resource` is a deprecated compatibility alias for `soap remove feature`.

```bash
soap remove route invoice create
soap remove feature invoice
soap remove controller invoice invoice-admin
soap remove entity invoice invoice
soap remove use-case invoice approve-invoice
soap remove repository invoice invoice
```

Remove commands only delete files tracked in `.soap/registry.json`.

## Interactive Flow

```bash
soap remove route invoice create -i
soap remove feature invoice -i
soap remove controller invoice invoice-admin -i
```

Interactive mode shows a preview before deletion:

- tracked files to delete
- modified tracked files
- registry entries to remove

Then it asks for confirmation.

Use `--yes` to skip confirmation:

```bash
soap remove route invoice create -i --yes
```

## Modified Files

Modified generated files are not deleted by default.

Use `--force` or `--on-conflict overwrite` to delete modified generated files:

```bash
soap remove route invoice create --force
soap remove feature invoice --on-conflict overwrite
```

`--dry-run` prints planned deletes and registry updates without changing files.

## Component Removal

Component removal targets generated files inside one feature:

```bash
soap remove controller invoice invoice-admin
soap remove entity invoice invoice
soap remove use-case invoice approve-invoice
```

These commands remove only files tracked in `.soap/registry.json` and refresh generated indexes such as `src/config/controllers.ts`.

Normally the feature must exist in the route registry. With `--force`, component removal can also target generated files whose owner matches the provided feature name, even when the feature itself is not registered:

```bash
soap remove entity identity profile --force
soap remove use-case identity approve-profile --force
soap remove controller identity admin-tools --force
```

## Repository Removal

Without flags, repository removal deletes both the port and implementation files:

```bash
soap remove repository invoice invoice
```

Use `--port` or `--impl` to limit the removal:

```bash
soap remove repository invoice invoice --port
soap remove repository invoice invoice --impl
```

The same forced-owner fallback applies to repositories:

```bash
soap remove repository identity account --force
```
