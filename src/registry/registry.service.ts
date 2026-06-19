import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { CommandContext } from "../core/command-context";
import { CliError } from "../core/errors";
import { GeneratedFileEntry, GeneratedFileType, SoapRegistryConfig } from "../config/schemas/types";

export interface RegisterFileOptions {
  root: string;
  relativePath: string;
  type: GeneratedFileType;
  owner?: string;
  registry: SoapRegistryConfig;
}

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function readFileHash(filePath: string): Promise<string | undefined> {
  try {
    return hashContent(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

export function upsertGeneratedFile(
  registry: SoapRegistryConfig,
  entry: Omit<GeneratedFileEntry, "generatedAt"> & { generatedAt?: string }
): void {
  const index = registry.generatedFiles.findIndex((item) => item.path === entry.path);
  const next: GeneratedFileEntry = {
    ...entry,
    generatedAt: entry.generatedAt ?? new Date().toISOString(),
  };

  if (index >= 0) {
    registry.generatedFiles[index] = next;
  } else {
    registry.generatedFiles.push(next);
  }
}

export async function assertCanWriteGeneratedFile(
  root: string,
  relativePath: string,
  registry: SoapRegistryConfig,
  options: { force?: boolean; writeNew?: boolean } = {}
): Promise<string> {
  const targetPath = path.join(root, relativePath);
  const entry = registry.generatedFiles.find((item) => item.path === relativePath);
  const currentHash = await readFileHash(targetPath);

  if (!currentHash || options.force) {
    return targetPath;
  }

  if (entry && entry.hash === currentHash) {
    return targetPath;
  }

  if (options.writeNew) {
    return `${targetPath}.new`;
  }

  throw new CliError(
    `Refusing to overwrite modified file ${relativePath}. Use --force to overwrite or --write-new to write ${relativePath}.new.`
  );
}

export async function registerGeneratedFile(
  options: RegisterFileOptions,
  content: string,
  context: CommandContext
): Promise<void> {
  upsertGeneratedFile(options.registry, {
    path: options.relativePath,
    type: options.type,
    owner: options.owner,
    hash: hashContent(content),
  });

  if (context.dryRun) {
    context.output.info(`[dry-run] register ${options.relativePath}`);
  }
}
