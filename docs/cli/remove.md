# `soap remove`

Safely remove generated routes, features, and feature components.

`soap remove resource` is a deprecated compatibility alias for `soap remove feature`.

```bash
soap remove route create --feature invoice
soap remove feature invoice
soap remove controller invoice-admin --feature invoice
soap remove entity invoice --feature invoice
soap remove use-case approve-invoice --feature invoice
soap remove repository invoice --feature invoice
```

Remove commands only delete files tracked in `.soap/registry.json`.

## Interactive Flow

```bash
soap remove route create --feature invoice -i
soap remove feature invoice -i
soap remove controller invoice-admin --feature invoice -i
```

Interactive mode shows a preview before deletion:

- tracked files to delete
- modified tracked files
- registry entries to remove

Then it asks for confirmation.

Use `--yes` to skip confirmation:

```bash
soap remove route create --feature invoice -i --yes
```

## Modified Files

Modified generated files are not deleted by default.

Use `--force` or `--on-conflict overwrite` to delete modified generated files:

```bash
soap remove route create --feature invoice --force
soap remove feature invoice --on-conflict overwrite
```

`--dry-run` prints planned deletes and registry updates without changing files.

## Component Removal

Component removal targets generated files inside one feature:

```bash
soap remove controller invoice-admin --feature invoice
soap remove entity invoice --feature invoice
soap remove use-case approve-invoice --feature invoice
```

These commands remove only files tracked in `.soap/registry.json` and refresh generated indexes such as `src/config/controllers.ts`.

Normally the feature must exist in the route registry. With `--force`, component removal can also target generated files whose owner matches the provided feature name, even when the feature itself is not registered:

```bash
soap remove entity profile --feature identity --force
soap remove use-case approve-profile --feature identity --force
soap remove controller admin-tools --feature identity --force
```

## Repository Removal

Without flags, repository removal deletes both the port and implementation files:

```bash
soap remove repository invoice --feature invoice
```

Use `--port` or `--impl` to limit the removal:

```bash
soap remove repository invoice --feature invoice --port
soap remove repository invoice --feature invoice --impl
```

The same forced-owner fallback applies to repositories:

```bash
soap remove repository account --feature identity --force
```
