# `soap remove`

Safely remove generated routes and features.

`soap remove resource` is a deprecated compatibility alias for `soap remove feature`.

```bash
soap remove route invoice create
soap remove feature invoice
```

Remove commands only delete files tracked in `.soap/registry.json`.

## Interactive Flow

```bash
soap remove route invoice create -i
soap remove feature invoice -i
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
