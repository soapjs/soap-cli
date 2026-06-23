import { Command } from "commander";
import { loadSoapConfig } from "../../config/load-soap-config";
import { writeSoapConfig } from "../../config/write-soap-config";
import {
  ApiClientCapability,
  AuthCapability,
  ContractsCapability,
  DatabaseCapability,
  DocsCapability,
  ProjectCapabilities,
  RealtimeCapability,
  SoapConfig,
} from "../../config/schemas/types";
import { getCommandContext } from "../../core/command-context";
import { CliError } from "../../core/errors";
import { resolveDependencies } from "../../dependencies/dependency-resolver";
import { PlannedFile, writePlannedFiles } from "../../io/file-writer";
import { createBrunoFiles } from "../generate/bruno-plan";
import {
  authOptions,
  contractsOptions,
  createProjectFiles,
  databaseOptions,
  docsOptions,
  parseCsvOption,
  ProjectPlan,
  realtimeOptions,
} from "../create/project-plan";
import { createControllersFile, createDatabaseFile, createFeaturesIndexFile, createResourcesFile } from "../add/resource-plan";
import { routeControllerIndexResourceFromPath } from "../add/route-plan";
import { addConflictOption, ConflictCommandOptions } from "../shared/common-options";

interface UpdateConfigOptions extends ConflictCommandOptions {
  addDb?: string[];
  addAuth?: string[];
  addDocs?: string[];
  addContracts?: string[];
  addApiClient?: string[];
  addRealtime?: string[];
  force?: boolean;
}

export function registerUpdateCommand(program: Command): void {
  const update = program.command("update").description("Update generated SoapJS project configuration.");

  addConflictOption(update
    .command("config")
    .description("Add project capabilities and generated infrastructure.")
    .option("--add-db <database>", "add database capability: mongo, postgres, mysql, sqlite, redis", collect, [])
    .option("--add-auth <auth>", "add auth capability: jwt, api-key, local", collect, [])
    .option("--add-docs <docs>", "add docs capability: openapi", collect, [])
    .option("--add-contracts <contracts>", "add contract capability: zod", collect, [])
    .option("--add-api-client <client>", "add API client capability: bruno", collect, [])
    .option("--add-realtime <realtime>", "add realtime capability: ws", collect, [])
    .option("--force", "overwrite generated infra files even when modified", false))
    .action(async (options: UpdateConfigOptions, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const nextCapabilities = cloneCapabilities(config.project.capabilities);
      const changes: string[] = [];

      addCapabilities(nextCapabilities.databases, parseCsvOption(options.addDb, databaseOptions), "db", changes);
      addCapabilities(nextCapabilities.auth, parseCsvOption(options.addAuth, authOptions), "auth", changes);
      addCapabilities(nextCapabilities.docs, parseCsvOption(options.addDocs, docsOptions), "docs", changes);
      addCapabilities(nextCapabilities.contracts, parseCsvOption(options.addContracts, contractsOptions), "contracts", changes);
      addCapabilities(nextCapabilities.apiClient, parseCsvOption(options.addApiClient, ["bruno"] as ApiClientCapability[]), "api-client", changes);
      addCapabilities(nextCapabilities.realtime, parseCsvOption(options.addRealtime, realtimeOptions), "realtime", changes);

      if (changes.length === 0) {
        throw new CliError("No new capabilities requested. Use --add-db, --add-auth, --add-docs, --add-contracts, --add-api-client, or --add-realtime.");
      }

      config.project.capabilities = nextCapabilities;
      updateApiConfig(config);

      const plan = createPlan(config);
      const files = createUpdateFiles(config, plan);

      if (context.dryRun) {
        context.output.info(`Capabilities: ${changes.join(", ")}`);
        context.output.info(`Files: ${files.length}`);
      }

      await writePlannedFiles(
        {
          root: config.root,
          files,
          registry: config.registry,
          force: options.force,
          onConflict: options.onConflict,
          skipModified: !options.force,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Updated project capabilities: ${changes.join(", ")}.`);
    });
}

function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function cloneCapabilities(capabilities: ProjectCapabilities): ProjectCapabilities {
  return {
    databases: [...capabilities.databases],
    auth: [...capabilities.auth],
    messaging: [...capabilities.messaging],
    realtime: [...capabilities.realtime],
    telemetry: [...capabilities.telemetry],
    apiClient: [...capabilities.apiClient],
    docs: [...capabilities.docs],
    contracts: [...capabilities.contracts],
  };
}

function addCapabilities<T extends string>(target: T[], values: T[], label: string, changes: string[]): void {
  for (const value of values) {
    if (!target.includes(value)) {
      target.push(value);
      changes.push(`${label}:${value}`);
    }
  }
}

function updateApiConfig(config: SoapConfig): void {
  config.api.bruno.enabled = config.project.capabilities.apiClient.includes("bruno");
  config.api.bruno.collectionPath ||= "bruno";
  config.api.bruno.environment ||= "Local";

  const defaultAuth = config.project.capabilities.auth[0] ?? "none";
  config.api.auth.default = defaultAuth;
  config.api.auth.loginRoute =
    defaultAuth === "jwt" || defaultAuth === "local"
      ? {
          method: "POST",
          path: "/auth/login",
          tokenVariable: "accessToken",
        }
      : undefined;
}

function createPlan(config: SoapConfig): ProjectPlan {
  return {
    name: config.project.name,
    root: config.root,
    framework: config.project.framework,
    architecture: config.project.architecture,
    packageManager: config.project.packageManager,
    capabilities: config.project.capabilities,
    zones: config.project.zones,
    dependencies: resolveDependencies(config.project.capabilities),
  };
}

function createUpdateFiles(config: SoapConfig, plan: ProjectPlan): PlannedFile[] {
  const projectFiles = createProjectFiles(plan).filter(shouldUpdateFromProjectPlan);
  const routeControllerIndexes = routeControllerIndexResources(
    config.registry.generatedFiles.map((file) => file.path),
    config.structure.featuresRoot
  );
  const mainControllerResources = config.registry.resources
    .filter((resource) => !routeControllerIndexes.includes(resource.name))
    .map((resource) => resource.name);
  const indexFiles = [
    createResourcesFile(config.registry.resources, config.structure.featuresRoot),
    createDatabaseFile(config.registry.resources, config.structure.featuresRoot),
    createFeaturesIndexFile(config.registry.resources, config.project.capabilities.auth),
    createControllersFile(
      config.registry.resources,
      config.structure.featuresRoot,
      config.project.capabilities.auth,
      routeControllerIndexes,
      mainControllerResources
    ),
  ];
  const brunoFiles = config.api.bruno.enabled ? createBrunoFiles(config) : [];

  return mergeFiles([...projectFiles, ...indexFiles, ...brunoFiles]);
}

function shouldUpdateFromProjectPlan(file: PlannedFile): boolean {
  if (
    [
      "package.json",
      "Makefile",
      ".env.example",
      "README.md",
      "docker-compose.yml",
      "src/index.ts",
      "src/config/config.ts",
      "src/config/dependencies.ts",
      "src/config/database.ts",
    ].includes(file.path)
  ) {
    return true;
  }

  return (
    /^src\/config\/[^/]+\.config\.ts$/.test(file.path) ||
    file.path.startsWith("src/common/") ||
    file.path.startsWith("src/features/auth/") ||
    file.path.startsWith("src/features/health/")
  );
}

function mergeFiles(files: PlannedFile[]): PlannedFile[] {
  const byPath = new Map<string, PlannedFile>();

  for (const file of files) {
    byPath.set(file.path, file);
  }

  return Array.from(byPath.values());
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
