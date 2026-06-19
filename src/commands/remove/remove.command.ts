import fs from "fs/promises";
import path from "path";
import { Command } from "commander";
import { loadSoapConfig } from "../../config/load-soap-config";
import { writeSoapConfig } from "../../config/write-soap-config";
import { GeneratedFileEntry, ResourceRegistryEntry, RouteRegistryEntry, SoapConfig } from "../../config/schemas/types";
import { getCommandContext, CommandContext } from "../../core/command-context";
import { CliError } from "../../core/errors";
import { PlannedFile, writePlannedFiles } from "../../io/file-writer";
import { ConflictPolicy, resolveConflictPolicy } from "../../io/conflict-policy";
import { readFileHash } from "../../registry/registry.service";
import { createNameVariants } from "../../templates/naming";
import { createFeaturesIndexFile, createResourcesFile, createControllersFile } from "../add/resource-plan";
import {
  createRouteControllersIndexFile,
  routeControllerIndexResourceFromPath,
  routeControllerNameFromPath,
} from "../add/route-plan";
import {
  addConflictOption,
  addInteractiveOption,
  assertInteractiveTerminal,
  ConflictCommandOptions,
  InteractiveCommandOptions,
} from "../shared/common-options";
import { InquirerPromptAdapter } from "../../prompts";

interface RemoveOptions extends InteractiveCommandOptions, ConflictCommandOptions {
  force?: boolean;
  yes?: boolean;
}

interface RemovePlan {
  deleted: string[];
  skipped: string[];
  conflictPolicy: ConflictPolicy;
}

interface RemovePreviewFile {
  path: string;
  exists: boolean;
  modified: boolean;
}

interface RemovePreview {
  files: RemovePreviewFile[];
  registryEntries: string[];
}

export function registerRemoveCommand(program: Command): void {
  const remove = program.command("remove").description("Safely remove generated resources and routes.");

  addConflictOption(addInteractiveOption(remove
    .command("route <resource> <route>")
    .description("Remove a generated route from a SoapJS project.")
    .option("--force", "delete modified generated files", false)
    .option("--yes", "skip interactive confirmation prompts", false)))
    .action(async (resourceInput: string, routeInput: string, options: RemoveOptions, command: Command) => {
      assertInteractiveTerminal(options);

      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const resource = resolveResource(config, resourceInput);
      const route = resolveRoute(config, resource, routeInput);
      const targetEntries = routeFileEntries(config, resource, route);
      const conflictPolicy = resolveRemoveConflictPolicy(options);
      const preview = await createRemovePreview(config, targetEntries, [`route ${resource.name}/${route.name}`]);

      if (options.interactive) {
        context.output.info(formatRemovePreview(`Remove route ${resource.name}/${route.name}`, preview));

        if (hasModifiedFiles(preview) && conflictPolicy !== "overwrite") {
          throw new CliError("Refusing to delete modified generated files. Use --force or --on-conflict overwrite to delete them.");
        }

        if (!options.yes) {
          const confirmed = await new InquirerPromptAdapter().confirm({
            message: "Continue removal?",
            defaultValue: false,
          });

          if (!confirmed) {
            context.output.warn("Route removal aborted.");
            return;
          }
        }
      }

      const removePlan = await removeTrackedFiles(config, targetEntries, conflictPolicy, context);
      if (removePlan.skipped.length > 0) {
        reportRemoveResult(context, `Skipped route ${resource.name}/${route.name}`, removePlan);
        return;
      }

      config.registry.routes = config.registry.routes.filter((entry) => entry !== route);
      removeGeneratedEntries(config, removePlan.deleted);

      await refreshGeneratedIndexes(config, removePlan.conflictPolicy === "overwrite", context, {
        changedResource: resource,
        deletedPaths: removePlan.deleted,
      });
      await writeSoapConfig(config.root, config, context);

      reportRemoveResult(context, `Removed route ${resource.name}/${route.name}`, removePlan);
    });

  addConflictOption(addInteractiveOption(remove
    .command("resource <resource>")
    .description("Remove a generated resource from a SoapJS project.")
    .option("--force", "delete modified generated files", false)
    .option("--yes", "skip interactive confirmation prompts", false)))
    .action(async (resourceInput: string, options: RemoveOptions, command: Command) => {
      assertInteractiveTerminal(options);

      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const resource = resolveResource(config, resourceInput);
      const targetEntries = config.registry.generatedFiles.filter((entry) => entry.owner === resource.name);
      const conflictPolicy = resolveRemoveConflictPolicy(options);
      const routeCount = config.registry.routes.filter((entry) => entry.resource === resource.name).length;
      const preview = await createRemovePreview(config, targetEntries, [
        `resource ${resource.name}`,
        `${routeCount} route${routeCount === 1 ? "" : "s"} for ${resource.name}`,
      ]);

      if (options.interactive) {
        context.output.info(formatRemovePreview(`Remove resource ${resource.name}`, preview));

        if (hasModifiedFiles(preview) && conflictPolicy !== "overwrite") {
          throw new CliError("Refusing to delete modified generated files. Use --force or --on-conflict overwrite to delete them.");
        }

        if (!options.yes) {
          const confirmed = await new InquirerPromptAdapter().confirm({
            message: "Continue removal?",
            defaultValue: false,
          });

          if (!confirmed) {
            context.output.warn("Resource removal aborted.");
            return;
          }
        }
      }

      const removePlan = await removeTrackedFiles(config, targetEntries, conflictPolicy, context);
      if (removePlan.skipped.length > 0) {
        reportRemoveResult(context, `Skipped resource ${resource.name}`, removePlan);
        return;
      }

      config.registry.resources = config.registry.resources.filter((entry) => entry !== resource);
      config.registry.routes = config.registry.routes.filter((entry) => entry.resource !== resource.name);
      removeGeneratedEntries(config, removePlan.deleted);

      await refreshGeneratedIndexes(config, removePlan.conflictPolicy === "overwrite", context, {
        deletedPaths: removePlan.deleted,
      });
      await writeSoapConfig(config.root, config, context);

      reportRemoveResult(context, `Removed resource ${resource.name}`, removePlan);
    });
}

function resolveResource(config: SoapConfig, input: string): ResourceRegistryEntry {
  const names = createNameVariants(input);
  const candidates = new Set([input, names.kebabName, singularize(names.kebabName), names.pluralName]);
  const resource = config.registry.resources.find((entry) => candidates.has(entry.name) || candidates.has(entry.path.replace(/^\//, "")));

  if (!resource) {
    throw new CliError(`Resource "${input}" was not found in the route registry.`);
  }

  return resource;
}

function resolveRoute(config: SoapConfig, resource: ResourceRegistryEntry, input: string): RouteRegistryEntry {
  const resourceNames = createNameVariants(resource.name);
  const routeNames = createNameVariants(input);
  const candidates = new Set([
    input,
    routeNames.kebabName,
    stripResourceSuffix(routeNames.kebabName, resourceNames.kebabName),
    stripResourceSuffix(routeNames.kebabName, resourceNames.pluralName),
  ]);
  const route = config.registry.routes.find((entry) => entry.resource === resource.name && candidates.has(entry.name));

  if (!route) {
    throw new CliError(`Route "${input}" was not found on resource "${resource.name}".`);
  }

  return route;
}

function stripResourceSuffix(value: string, resourceName: string): string {
  const suffix = `-${resourceName}`;
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
}

function resolveRemoveConflictPolicy(options: RemoveOptions): ConflictPolicy {
  const policy = resolveConflictPolicy({
    force: options.force,
    onConflict: options.onConflict,
    skipModified: !options.force,
  });

  if (policy === "new") {
    throw new CliError("Conflict policy \"new\" is not supported for remove commands.");
  }

  return policy;
}

function singularize(value: string): string {
  return value.endsWith("s") ? value.slice(0, -1) : value;
}

async function createRemovePreview(
  config: SoapConfig,
  entries: GeneratedFileEntry[],
  registryEntries: string[]
): Promise<RemovePreview> {
  const files = await Promise.all(entries.map(async (entry) => {
    const currentHash = await readFileHash(path.join(config.root, entry.path));

    return {
      path: entry.path,
      exists: currentHash !== undefined,
      modified: Boolean(currentHash && currentHash !== entry.hash),
    };
  }));

  return {
    files,
    registryEntries,
  };
}

function formatRemovePreview(title: string, preview: RemovePreview): string {
  const modifiedFiles = preview.files.filter((file) => file.modified);
  const lines = [
    title,
    `Tracked files to delete: ${preview.files.length}`,
    ...formatPreviewFiles(preview.files),
    `Modified tracked files: ${modifiedFiles.length}`,
    ...formatPreviewFiles(modifiedFiles),
    `Registry entries to remove: ${preview.registryEntries.length}`,
    ...preview.registryEntries.map((entry) => `- ${entry}`),
  ];

  return lines.join("\n");
}

function formatPreviewFiles(files: RemovePreviewFile[]): string[] {
  if (files.length === 0) {
    return ["- none"];
  }

  return files.map((file) => {
    const suffix = file.modified ? " (modified)" : file.exists ? "" : " (missing)";
    return `- ${file.path}${suffix}`;
  });
}

function hasModifiedFiles(preview: RemovePreview): boolean {
  return preview.files.some((file) => file.modified);
}

function routeFileEntries(config: SoapConfig, resource: ResourceRegistryEntry, route: RouteRegistryEntry): GeneratedFileEntry[] {
  const resourceNames = createNameVariants(resource.name);
  const routeNames = createNameVariants(route.name);
  const routeFileNames = new Set([
    routeNames.kebabName,
    `${routeNames.kebabName}-${resourceNames.kebabName}`,
    `${routeNames.kebabName}-${resourceNames.pluralName}`,
  ]);
  const brunoPath = path.posix.join(config.api.bruno.collectionPath, resourceNames.pascalName, `${routeNames.pascalName}.bru`);

  return config.registry.generatedFiles.filter((entry) => {
    if (entry.path === brunoPath) {
      return true;
    }

    if (entry.owner !== resource.name || entry.type !== "route") {
      return false;
    }

    const fileName = path.posix.basename(entry.path).replace(/\.(controller|contract)\.ts$/, "");
    return routeFileNames.has(fileName);
  });
}

async function removeTrackedFiles(
  config: SoapConfig,
  entries: GeneratedFileEntry[],
  conflictPolicy: ConflictPolicy,
  context: CommandContext
): Promise<RemovePlan> {
  const deleted: string[] = [];
  const skipped: string[] = [];
  const currentHashes = new Map<string, string | undefined>();

  for (const entry of entries) {
    const absolutePath = path.join(config.root, entry.path);
    const currentHash = await readFileHash(absolutePath);
    currentHashes.set(entry.path, currentHash);

    if (currentHash && currentHash !== entry.hash && conflictPolicy !== "overwrite") {
      if (conflictPolicy === "abort") {
        throw new CliError(`Refusing to delete modified file ${entry.path}. Use --force or --on-conflict overwrite to delete it.`);
      }

      if (conflictPolicy === "ask") {
        throw new CliError(`Interactive conflict resolution is not available yet for ${entry.path}. Use --on-conflict skip, overwrite, or abort.`);
      }

      skipped.push(entry.path);
      context.output.warn(`Skipped modified file ${entry.path}. Use --force to delete it.`);
    }
  }

  if (skipped.length > 0) {
    return { deleted, skipped, conflictPolicy };
  }

  for (const entry of entries) {
    const absolutePath = path.join(config.root, entry.path);
    const currentHash = currentHashes.get(entry.path);

    if (!currentHash) {
      deleted.push(entry.path);
    } else if (context.dryRun) {
      context.output.info(`[dry-run] delete ${absolutePath}`);
    } else {
      await fs.unlink(absolutePath);
      await pruneEmptyParents(path.dirname(absolutePath), config.root);
    }

    if (currentHash) {
      deleted.push(entry.path);
    }
  }

  return { deleted, skipped, conflictPolicy };
}

async function pruneEmptyParents(startPath: string, root: string): Promise<void> {
  let current = startPath;

  while (current.startsWith(root) && current !== root) {
    try {
      await fs.rmdir(current);
    } catch (error) {
      return;
    }

    current = path.dirname(current);
  }
}

function removeGeneratedEntries(config: SoapConfig, deletedPaths: string[]): void {
  const deleted = new Set(deletedPaths);
  config.registry.generatedFiles = config.registry.generatedFiles.filter((entry) => !deleted.has(entry.path));
}

async function refreshGeneratedIndexes(
  config: SoapConfig,
  force: boolean,
  context: CommandContext,
  options: { changedResource?: ResourceRegistryEntry; deletedPaths: string[] }
): Promise<void> {
  const generatedPaths = config.registry.generatedFiles.map((entry) => entry.path);
  const routeIndexResources = routeControllerIndexResources(generatedPaths, config.structure.featuresRoot);
  const files: PlannedFile[] = [
    createResourcesFile(config.registry.resources, config.structure.featuresRoot),
    createFeaturesIndexFile(config.registry.resources, config.project.capabilities.auth),
    createControllersFile(
      config.registry.resources,
      config.structure.featuresRoot,
      config.project.capabilities.auth,
      routeIndexResources,
      config.registry.resources.filter((resource) => !routeIndexResources.includes(resource.name)).map((resource) => resource.name)
    ),
  ];

  if (options.changedResource && config.registry.resources.includes(options.changedResource)) {
    const routeNames = routeControllerNamesForResource(generatedPaths, config.structure.featuresRoot, options.changedResource.name);
    const indexPath = path.posix.join(
      config.structure.featuresRoot,
      options.changedResource.name,
      "api",
      `${options.changedResource.name}.controllers.ts`
    );

    if (routeNames.length > 0) {
      files.push(createRouteControllersIndexFile(options.changedResource, config.structure.featuresRoot, routeNames));
    } else {
      const indexEntry = config.registry.generatedFiles.find((entry) => entry.path === indexPath);
      if (indexEntry) {
        const removePlan = await removeTrackedFiles(config, [indexEntry], force ? "overwrite" : "skip", context);
        removeGeneratedEntries(config, removePlan.deleted);
      }
    }
  }

  await writePlannedFiles(
    {
      root: config.root,
      files,
      registry: config.registry,
      force,
      skipModified: !force,
    },
    context
  );
}

function routeControllerNamesForResource(generatedPaths: string[], featuresRoot: string, resourceName: string): string[] {
  const apiPrefix = `${featuresRoot}/${resourceName}/api/`;
  return Array.from(
    new Set(
      generatedPaths
        .filter((filePath) => filePath.startsWith(apiPrefix))
        .map(routeControllerNameFromPath)
        .filter((name): name is string => Boolean(name))
        .filter((name) => name !== resourceName)
    )
  ).sort();
}

function routeControllerIndexResources(generatedPaths: string[], featuresRoot: string): string[] {
  return Array.from(
    new Set(
      generatedPaths
        .map((filePath) => routeControllerIndexResourceFromPath(filePath, featuresRoot))
        .filter((name): name is string => Boolean(name))
    )
  ).sort();
}

function reportRemoveResult(context: CommandContext, message: string, plan: RemovePlan): void {
  if (plan.skipped.length > 0 && plan.deleted.length === 0) {
    context.output.warn(`${message}; ${plan.skipped.length} modified files left untouched. Use --force to remove them.`);
    return;
  }

  const suffix = plan.skipped.length > 0 ? ` (${plan.skipped.length} modified files skipped)` : "";
  if (context.dryRun) {
    context.output.success(`${message.replace(/^Removed/, "Would remove")}; would delete ${plan.deleted.length} files${suffix}.`);
    return;
  }

  context.output.success(`${message}; deleted ${plan.deleted.length} files${suffix}.`);
}
