import fs from "fs/promises";
import path from "path";
import { CommandContext } from "../core/command-context";
import { GeneratedFileType, SoapRegistryConfig } from "../config/schemas/types";
import { assertCanWriteGeneratedFile, registerGeneratedFile } from "../registry/registry.service";
import { CliError } from "../core/errors";
import { resolveConflictPolicy } from "./conflict-policy";
import { formatFile } from "./format-file";

export interface PlannedFile {
  path: string;
  type: GeneratedFileType;
  content: string;
  owner?: string;
  executable?: boolean;
}

export interface WriteFilesOptions {
  root: string;
  files: PlannedFile[];
  registry: SoapRegistryConfig;
  force?: boolean;
  writeNew?: boolean;
  skipModified?: boolean;
  onConflict?: string;
}

export async function writePlannedFiles(options: WriteFilesOptions, context: CommandContext): Promise<void> {
  const conflictPolicy = resolveConflictPolicy(options);

  for (const file of options.files) {
    const formatted = formatFile(file.path, file.content);
    let targetPath: string;

    try {
      targetPath = await assertCanWriteGeneratedFile(options.root, file.path, options.registry, {
        force: conflictPolicy === "overwrite",
        writeNew: conflictPolicy === "new",
      });
    } catch (error) {
      if (conflictPolicy === "skip" && error instanceof CliError) {
        context.output.warn(`Skipped modified file ${file.path}. Use --force to overwrite or --write-new to write ${file.path}.new.`);
        continue;
      }

      if (conflictPolicy === "ask" && error instanceof CliError) {
        throw new CliError(`Interactive conflict resolution is not available yet for ${file.path}. Use --on-conflict skip, overwrite, new, or abort.`);
      }

      throw error;
    }
    const originalPath = path.join(options.root, file.path);
    const writesOriginalPath = targetPath === originalPath;

    if (context.dryRun) {
      context.output.info(`[dry-run] write ${targetPath}`);
      if (writesOriginalPath) {
        await registerGeneratedFile(
          {
            root: options.root,
            relativePath: file.path,
            type: file.type,
            owner: file.owner,
            registry: options.registry,
          },
          formatted,
          context
        );
      }
      continue;
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, formatted, "utf8");

    if (file.executable) {
      await fs.chmod(targetPath, 0o755);
    }

    if (writesOriginalPath) {
      await registerGeneratedFile(
        {
          root: options.root,
          relativePath: file.path,
          type: file.type,
          owner: file.owner,
          registry: options.registry,
        },
        formatted,
        context
      );
    }
  }
}
