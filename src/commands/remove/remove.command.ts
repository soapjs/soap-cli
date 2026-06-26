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
  createFeatureRouteControllerFile,
  createNamedRouteControllerFile,
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
  feature?: string;
  force?: boolean;
  yes?: boolean;
}

interface RemoveRepositoryOptions extends RemoveOptions {
  impl?: boolean;
  port?: boolean;
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
  const remove = program.command("remove").description("Safely remove generated features, routes, and components.");

  addConflictOption(addInteractiveOption(remove
    .command("route [route]")
    .description("Remove a generated route from a feature.")
    .option("--feature <feature>", "feature that owns the route")
    .option("--force", "delete modified generated files", false)
    .option("--yes", "skip interactive confirmation prompts", false)))
    .action(async (routeInput: string | undefined, options: RemoveOptions, command: Command) => {
      assertInteractiveTerminal(options);

      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      if (!options.interactive && (!options.feature || !routeInput)) {
        throw new CliError("Feature and route name are required. Use `soap remove route <route> --feature <feature>`.");
      }

      const prompt = options.interactive ? new InquirerPromptAdapter() : undefined;
      const resource = options.feature
        ? resolveResource(config, options.feature)
        : await promptRemoveRouteResource(prompt, config);
      const resolvedRouteInput = routeInput ?? await promptRemoveRouteName(prompt, config, resource);
      const route = resolveRoute(config, resource, resolvedRouteInput);
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
        changedController: route.controller ?? route.name,
        deletedPaths: removePlan.deleted,
      });
      await writeSoapConfig(config.root, config, context);

      reportRemoveResult(context, `Removed route ${resource.name}/${route.name}`, removePlan);
    });

  addConflictOption(addInteractiveOption(remove
    .command("feature <feature>")
    .alias("resource")
    .description("Remove a generated feature from a SoapJS project. Deprecated alias: resource.")
    .option("--force", "delete modified generated files", false)
    .option("--yes", "skip interactive confirmation prompts", false)))
    .action(async (featureInput: string, options: RemoveOptions, command: Command) => {
      assertInteractiveTerminal(options);

      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const resource = resolveResource(config, featureInput);
      const targetEntries = config.registry.generatedFiles.filter((entry) => entry.owner === resource.name);
      const conflictPolicy = resolveRemoveConflictPolicy(options);
      const routeCount = config.registry.routes.filter((entry) => entry.resource === resource.name).length;
      const preview = await createRemovePreview(config, targetEntries, [
        `feature ${resource.name}`,
        `${routeCount} route${routeCount === 1 ? "" : "s"} for ${resource.name}`,
      ]);

      if (options.interactive) {
        context.output.info(formatRemovePreview(`Remove feature ${resource.name}`, preview));

        if (hasModifiedFiles(preview) && conflictPolicy !== "overwrite") {
          throw new CliError("Refusing to delete modified generated files. Use --force or --on-conflict overwrite to delete them.");
        }

        if (!options.yes) {
          const confirmed = await new InquirerPromptAdapter().confirm({
            message: "Continue removal?",
            defaultValue: false,
          });

          if (!confirmed) {
            context.output.warn("Feature removal aborted.");
            return;
          }
        }
      }

      const removePlan = await removeTrackedFiles(config, targetEntries, conflictPolicy, context);
      if (removePlan.skipped.length > 0) {
        reportRemoveResult(context, `Skipped feature ${resource.name}`, removePlan);
        return;
      }

      config.registry.resources = config.registry.resources.filter((entry) => entry !== resource);
      config.registry.routes = config.registry.routes.filter((entry) => entry.resource !== resource.name);
      removeGeneratedEntries(config, removePlan.deleted);

      await refreshGeneratedIndexes(config, removePlan.conflictPolicy === "overwrite", context, {
        deletedPaths: removePlan.deleted,
      });
      await writeSoapConfig(config.root, config, context);

      reportRemoveResult(context, `Removed feature ${resource.name}`, removePlan);
    });

  addConflictOption(addInteractiveOption(remove
    .command("controller <controller>")
    .description("Remove a generated mock controller from a feature.")
    .option("--feature <feature>", "feature that owns the controller")
    .option("--force", "delete modified generated files", false)
    .option("--yes", "skip interactive confirmation prompts", false)))
    .action(async (controllerInput: string, options: RemoveOptions, command: Command) => {
      await removeComponent({
        command,
        options,
        featureInput: options.feature,
        componentInput: controllerInput,
        label: "controller",
        allowMissingFeatureWithForce: true,
        entries: (config, resource) => componentFileEntries(config, resource, controllerInput, "controller"),
        successMessage: (resource, name) => `Removed controller ${resource.name}/${name}`,
        skipMessage: (resource, name) => `Skipped controller ${resource.name}/${name}`,
      });
    });

  addConflictOption(addInteractiveOption(remove
    .command("entity <entity>")
    .description("Remove a generated entity from a feature.")
    .option("--feature <feature>", "feature that owns the entity")
    .option("--force", "delete modified generated files", false)
    .option("--yes", "skip interactive confirmation prompts", false)))
    .action(async (entityInput: string, options: RemoveOptions, command: Command) => {
      await removeComponent({
        command,
        options,
        featureInput: options.feature,
        componentInput: entityInput,
        label: "entity",
        allowMissingFeatureWithForce: true,
        entries: (config, resource) => componentFileEntries(config, resource, entityInput, "entity"),
        successMessage: (resource, name) => `Removed entity ${resource.name}/${name}`,
        skipMessage: (resource, name) => `Skipped entity ${resource.name}/${name}`,
      });
    });

  addConflictOption(addInteractiveOption(remove
    .command("use-case <useCase>")
    .description("Remove a generated use case from a feature.")
    .option("--feature <feature>", "feature that owns the use case")
    .option("--force", "delete modified generated files", false)
    .option("--yes", "skip interactive confirmation prompts", false)))
    .action(async (useCaseInput: string, options: RemoveOptions, command: Command) => {
      await removeComponent({
        command,
        options,
        featureInput: options.feature,
        componentInput: useCaseInput,
        label: "use-case",
        allowMissingFeatureWithForce: true,
        entries: (config, resource) => componentFileEntries(config, resource, useCaseInput, "use-case"),
        successMessage: (resource, name) => `Removed use case ${resource.name}/${name}`,
        skipMessage: (resource, name) => `Skipped use case ${resource.name}/${name}`,
      });
    });

  addConflictOption(addInteractiveOption(remove
    .command("repository <repository>")
    .description("Remove generated repository files from a feature.")
    .option("--feature <feature>", "feature that owns the repository")
    .option("--impl", "remove repository implementation files only", false)
    .option("--port", "remove repository port files only", false)
    .option("--force", "delete modified generated files", false)
    .option("--yes", "skip interactive confirmation prompts", false)))
    .action(async (repositoryInput: string, options: RemoveRepositoryOptions, command: Command) => {
      await removeComponent({
        command,
        options,
        featureInput: options.feature,
        componentInput: repositoryInput,
        label: "repository",
        allowMissingFeatureWithForce: true,
        entries: (config, resource) => repositoryFileEntries(config, resource, repositoryInput, options),
        successMessage: (resource, name) => `Removed repository ${resource.name}/${name}`,
        skipMessage: (resource, name) => `Skipped repository ${resource.name}/${name}`,
      });
    });
}

async function removeComponent(input: {
  command: Command;
  options: RemoveOptions;
  featureInput?: string;
  componentInput: string;
  label: string;
  allowMissingFeatureWithForce?: boolean;
  entries: (config: SoapConfig, resource: ResourceRegistryEntry) => GeneratedFileEntry[];
  successMessage: (resource: ResourceRegistryEntry, name: string) => string;
  skipMessage: (resource: ResourceRegistryEntry, name: string) => string;
}): Promise<void> {
  assertInteractiveTerminal(input.options);

  const context = getCommandContext(input.command);
  const config = await loadSoapConfig(context.cwd);
  if (!input.featureInput) {
    throw new CliError(`Feature is required. Use \`soap remove ${input.label} <name> --feature <feature>\`.`);
  }

  const resource = resolveResource(config, input.featureInput, {
    allowMissing: Boolean(input.allowMissingFeatureWithForce && input.options.force),
  });
  const componentName = createNameVariants(input.componentInput).kebabName;
  const targetEntries = input.entries(config, resource);

  if (targetEntries.length === 0) {
    throw new CliError(`${capitalize(input.label)} "${input.componentInput}" was not found in feature "${resource.name}".`);
  }

  const conflictPolicy = resolveRemoveConflictPolicy(input.options);
  const preview = await createRemovePreview(config, targetEntries, [`${input.label} ${resource.name}/${componentName}`]);

  if (input.options.interactive) {
    context.output.info(formatRemovePreview(`Remove ${input.label} ${resource.name}/${componentName}`, preview));

    if (hasModifiedFiles(preview) && conflictPolicy !== "overwrite") {
      throw new CliError("Refusing to delete modified generated files. Use --force or --on-conflict overwrite to delete them.");
    }

    if (!input.options.yes) {
      const confirmed = await new InquirerPromptAdapter().confirm({
        message: "Continue removal?",
        defaultValue: false,
      });

      if (!confirmed) {
        context.output.warn(`${capitalize(input.label)} removal aborted.`);
        return;
      }
    }
  }

  const removePlan = await removeTrackedFiles(config, targetEntries, conflictPolicy, context);
  if (removePlan.skipped.length > 0) {
    reportRemoveResult(context, input.skipMessage(resource, componentName), removePlan);
    return;
  }

  removeGeneratedEntries(config, removePlan.deleted);
  await refreshGeneratedIndexes(config, removePlan.conflictPolicy === "overwrite", context, {
    deletedPaths: removePlan.deleted,
  });
  await writeSoapConfig(config.root, config, context);

  reportRemoveResult(context, input.successMessage(resource, componentName), removePlan);
}

function resolveResource(config: SoapConfig, input: string, options: { allowMissing?: boolean } = {}): ResourceRegistryEntry {
  const names = createNameVariants(input);
  const candidates = new Set([input, names.kebabName, singularize(names.kebabName), names.pluralName]);
  const resource = config.registry.resources.find((entry) => candidates.has(entry.name) || candidates.has(entry.path.replace(/^\//, "")));

  if (!resource && options.allowMissing) {
    return createForcedResourceReference(config, input, candidates);
  }

  if (!resource) {
    throw new CliError(`Feature "${input}" was not found in the route registry.`);
  }

  return resource;
}

function createForcedResourceReference(config: SoapConfig, input: string, candidates: Set<string>): ResourceRegistryEntry {
  const owner = config.registry.generatedFiles
    .map((entry) => entry.owner)
    .find((entryOwner): entryOwner is string => Boolean(entryOwner && candidates.has(entryOwner)));
  const fallbackName = createNameVariants(input).kebabName;
  const name = owner ?? fallbackName;

  return {
    name,
    path: `/${createNameVariants(name).pluralName}`,
    crud: false,
    db: "none",
    auth: "none",
    zone: "public",
    fields: [],
    generatedAt: new Date(0).toISOString(),
  };
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

async function promptRemoveRouteResource(
  prompt: InquirerPromptAdapter | undefined,
  config: SoapConfig
): Promise<ResourceRegistryEntry> {
  if (!prompt) {
    throw new CliError("Feature is required. Use --feature <feature>.");
  }

  const resourcesWithRoutes = config.registry.resources.filter((resource) =>
    config.registry.routes.some((route) => route.resource === resource.name)
  );

  if (resourcesWithRoutes.length === 0) {
    throw new CliError("No generated routes found.");
  }

  const selected = await prompt.select<string>({
    message: "Feature",
    choices: resourcesWithRoutes.map((resource) => ({
      label: `${resource.name} (${resource.path})`,
      value: resource.name,
    })),
  });

  return resolveResource(config, selected);
}

async function promptRemoveRouteName(
  prompt: InquirerPromptAdapter | undefined,
  config: SoapConfig,
  resource: ResourceRegistryEntry
): Promise<string> {
  if (!prompt) {
    throw new CliError("Route name is required.");
  }

  const routes = config.registry.routes
    .filter((route) => route.resource === resource.name)
    .sort((left, right) => left.name.localeCompare(right.name));

  if (routes.length === 0) {
    throw new CliError(`No generated routes found in feature "${resource.name}".`);
  }

  return prompt.select<string>({
    message: "Route",
    choices: routes.map((route) => ({
      label: `${route.name} (${route.method} ${route.path})`,
      value: route.name,
    })),
  });
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  const singularResourceNames = createNameVariants(singularize(resourceNames.kebabName));
  const routeNames = createNameVariants(route.name);
  const controllerName = controllerNameForRoute(config, resource, route);
  const controllerRoutes = routesForController(config.registry.routes, resource.name, controllerName, config.project.controllerLayout);
  const routeFileNames = new Set([
    routeNames.kebabName,
    `${routeNames.kebabName}-${singularResourceNames.kebabName}`,
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

    const basename = path.posix.basename(entry.path);
    const controllerMatch = basename.match(/^(.+)\.controller\.ts$/);
    if (controllerMatch) {
      return controllerMatch[1] === controllerName && controllerRoutes.length <= 1;
    }

    const contractMatch = basename.match(/^(.+)\.contract(?:\.spec)?\.ts$/);
    return Boolean(contractMatch && routeFileNames.has(contractMatch[1]));
  });
}

function controllerNameForRoute(
  config: SoapConfig,
  resource: ResourceRegistryEntry,
  route: RouteRegistryEntry
): string {
  if (route.controller) {
    return route.controller;
  }

  if (config.project.controllerLayout === "per-feature") {
    return resource.name;
  }

  return route.name;
}

function routesForController(
  routes: RouteRegistryEntry[],
  resourceName: string,
  controllerName: string,
  controllerLayout: SoapConfig["project"]["controllerLayout"]
): RouteRegistryEntry[] {
  return routes.filter((route) => {
    if (route.resource !== resourceName) {
      return false;
    }

    if (route.controller) {
      return route.controller === controllerName;
    }

    if (controllerLayout === "per-feature") {
      return controllerName === resourceName;
    }

    return route.name === controllerName;
  });
}

function componentFileEntries(
  config: SoapConfig,
  resource: ResourceRegistryEntry,
  input: string,
  type: "controller" | "entity" | "use-case"
): GeneratedFileEntry[] {
  const candidates = componentNameCandidates(input);

  return config.registry.generatedFiles.filter((entry) => {
    if (entry.owner !== resource.name || entry.type !== type) {
      return false;
    }

    const componentName = componentNameFromPath(entry.path, type);
    return componentName ? candidates.has(componentName) : false;
  });
}

function repositoryFileEntries(
  config: SoapConfig,
  resource: ResourceRegistryEntry,
  input: string,
  options: Pick<RemoveRepositoryOptions, "impl" | "port">
): GeneratedFileEntry[] {
  const candidates = componentNameCandidates(input);
  const includePort = Boolean(options.port) || (!options.impl && !options.port);
  const includeImpl = Boolean(options.impl) || (!options.impl && !options.port);

  return config.registry.generatedFiles.filter((entry) => {
    if (entry.owner !== resource.name || entry.type !== "repository") {
      return false;
    }

    const isPort = entry.path.includes("/application/ports/");
    if (isPort && !includePort) {
      return false;
    }

    if (!isPort && !includeImpl) {
      return false;
    }

    return repositoryNameCandidatesFromPath(entry.path).some((name) => candidates.has(name));
  });
}

function componentNameCandidates(input: string): Set<string> {
  const names = createNameVariants(input);
  const candidates = new Set([input, names.kebabName, names.pluralName, singularize(names.kebabName)]);

  return new Set(Array.from(candidates).map((candidate) => createNameVariants(candidate).kebabName));
}

function componentNameFromPath(filePath: string, type: "controller" | "entity" | "use-case"): string | undefined {
  const fileName = path.posix.basename(filePath);

  if (type === "controller") {
    return fileName.replace(/\.controller\.ts$/, "");
  }

  if (type === "entity") {
    return fileName.replace(/\.entity(?:\.spec)?\.ts$/, "");
  }

  return fileName.replace(/\.use-case(?:\.spec)?\.ts$/, "");
}

function repositoryNameCandidatesFromPath(filePath: string): string[] {
  const fileName = path.posix.basename(filePath)
    .replace(/\.ts$/, "")
    .replace(/\.spec$/, "");
  const baseNames = new Set<string>([fileName]);

  for (const suffix of [
    "-repository.port",
    ".repository",
    ".memory-repository",
    ".mongo-repository",
    ".sql-repository",
    ".repository.mongo",
    ".repository.sql",
    ".mapper",
    ".model",
    ".row",
    ".schema",
  ]) {
    if (fileName.endsWith(suffix)) {
      baseNames.add(fileName.slice(0, -suffix.length));
    }
  }

  return Array.from(baseNames).flatMap((name) => {
    const variants = createNameVariants(name);
    return [variants.kebabName, singularize(variants.kebabName), variants.pluralName];
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
  options: { changedResource?: ResourceRegistryEntry; changedController?: string; deletedPaths: string[] }
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
      config.registry.resources.filter((resource) => !routeIndexResources.includes(resource.name)).map((resource) => resource.name),
      config.registry.generatedFiles
    ),
  ];

  if (options.changedResource && config.registry.resources.includes(options.changedResource)) {
    if (config.project.controllerLayout === "per-feature") {
      const routes = config.registry.routes.filter((route) => route.resource === options.changedResource!.name);
      const controllerPath = path.posix.join(
        config.structure.featuresRoot,
        options.changedResource.name,
        "api",
        `${options.changedResource.name}.controller.ts`
      );

      if (routes.length > 0) {
        files.push(createFeatureRouteControllerFile({
          resource: options.changedResource,
          routes,
          featuresRoot: config.structure.featuresRoot,
          architecture: config.project.architecture,
        }));
      } else {
        const controllerEntry = config.registry.generatedFiles.find((entry) => entry.path === controllerPath && entry.type === "route");
        if (controllerEntry) {
          const removePlan = await removeTrackedFiles(config, [controllerEntry], force ? "overwrite" : "skip", context);
          removeGeneratedEntries(config, removePlan.deleted);
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
      return;
    }

    if (options.changedController) {
      const controllerRoutes = routesForController(
        config.registry.routes,
        options.changedResource.name,
        options.changedController,
        config.project.controllerLayout
      );
      const controllerPath = path.posix.join(
        config.structure.featuresRoot,
        options.changedResource.name,
        "api",
        `${options.changedController}.controller.ts`
      );

      if (controllerRoutes.length > 0) {
        files.push(createNamedRouteControllerFile({
          resource: options.changedResource,
          routes: controllerRoutes,
          featuresRoot: config.structure.featuresRoot,
          architecture: config.project.architecture,
          controllerName: options.changedController,
        }));
      } else {
        const controllerEntry = config.registry.generatedFiles.find((entry) => entry.path === controllerPath && entry.type === "route");
        if (controllerEntry) {
          const removePlan = await removeTrackedFiles(config, [controllerEntry], force ? "overwrite" : "skip", context);
          removeGeneratedEntries(config, removePlan.deleted);
        }
      }
    }

    const routeNames = routeControllerNamesForResource(config.registry.generatedFiles.map((entry) => entry.path), config.structure.featuresRoot, options.changedResource.name);
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
