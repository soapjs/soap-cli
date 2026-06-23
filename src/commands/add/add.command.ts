import { Command } from "commander";
import { getCommandContext } from "../../core/command-context";
import { CliError } from "../../core/errors";
import { loadSoapConfig } from "../../config/load-soap-config";
import { writeSoapConfig } from "../../config/write-soap-config";
import { ApiZone, AuthCapability, AuthPolicy, DatabaseCapability, RouteRegistryEntry, SoapConfig } from "../../config/schemas/types";
import { writePlannedFiles } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";
import { parseAuthPolicy } from "../../config/auth-policy";
import { createBrunoFiles } from "../generate/bruno-plan";
import {
  commandFeatureFromPath,
  commandNameFromPath,
  createCommandFiles,
  createCommandIndexFile,
  createCqrsConfigFile,
} from "./command-plan";
import { createEntityFiles } from "./entity-plan";
import { createEventFiles } from "./event-plan";
import {
  createQueryFiles,
  createQueryIndexFile,
  queryFeatureFromPath,
  queryNameFromPath,
} from "./query-plan";
import { createRepositoryFiles } from "./repository-plan";
import {
  createControllersFile,
  createDatabaseFile,
  createFeaturesIndexFile,
  createResourceAddPlanningSummary,
  createResourceEntry,
  createResourceFiles,
  createResourcesFile,
  formatResourceAddPlanningSummary,
  parseCrudRouteMatrix,
  parseResourceFieldDefinitions,
  CrudRouteMatrix,
} from "./resource-plan";
import {
  createRouteContractFile,
  createRouteContractSpecFile,
  createRouteControllerFile,
  createRouteControllersIndexFile,
  createRouteEntry,
  routeControllerIndexResourceFromPath,
  routeControllerNameFromPath,
  routeMethods,
  RouteMethod,
} from "./route-plan";
import { createSocketFiles } from "./socket-plan";
import { createUseCaseFiles } from "./use-case-plan";
import {
  addConflictOption,
  addInteractiveOption,
  assertInteractiveTerminal,
  ConflictCommandOptions,
  InteractiveCommandOptions,
} from "../shared/common-options";
import { addResourceResolver } from "../../resolvers/add-resource.resolver";
import { addRouteResolver } from "../../resolvers/add-route.resolver";
import { InquirerPromptAdapter, promptAddResource, promptAddRoute } from "../../prompts";

interface AddResourceOptions extends InteractiveCommandOptions, ConflictCommandOptions {
  crud?: boolean;
  db?: "none" | DatabaseCapability;
  auth?: "none" | AuthCapability;
  zone?: ApiZone;
  policy?: string;
  field?: string[];
  crudRoute?: string[];
  dryRun?: boolean;
  bruno?: boolean;
  enableBruno?: boolean;
  yes?: boolean;
  force?: boolean;
  writeNew?: boolean;
}

interface AddRouteOptions extends InteractiveCommandOptions, ConflictCommandOptions {
  method?: RouteMethod;
  path?: string;
  useCase?: string;
  command?: string;
  query?: string;
  auth?: "none" | AuthCapability;
  zone?: ApiZone;
  policy?: string;
  bruno?: boolean;
  force?: boolean;
  writeNew?: boolean;
}

interface AddCommandOptions extends ConflictCommandOptions {
  feature?: string;
  force?: boolean;
  writeNew?: boolean;
}

interface AddQueryOptions extends ConflictCommandOptions {
  feature?: string;
  force?: boolean;
  writeNew?: boolean;
}

interface AddRepositoryOptions extends ConflictCommandOptions {
  feature?: string;
  db?: Extract<DatabaseCapability, "mongo" | "postgres" | "mysql" | "sqlite">;
  force?: boolean;
  writeNew?: boolean;
}

interface AddEventOptions extends ConflictCommandOptions {
  feature?: string;
  force?: boolean;
  writeNew?: boolean;
}

interface AddEntityOptions extends ConflictCommandOptions {
  feature?: string;
  force?: boolean;
  writeNew?: boolean;
}

interface AddUseCaseOptions extends ConflictCommandOptions {
  feature?: string;
  force?: boolean;
  writeNew?: boolean;
}

interface AddSocketOptions extends ConflictCommandOptions {
  feature?: string;
  auth?: "none" | AuthCapability;
  force?: boolean;
  writeNew?: boolean;
}

export function registerAddCommand(program: Command): void {
  const add = program.command("add").description("Add features, routes, and project components.");

  addConflictOption(addInteractiveOption(add
    .command("feature <name>")
    .alias("resource")
    .description("Add a feature to an existing SoapJS project. Deprecated alias: resource.")
    .option("--crud", "generate CRUD route placeholders", false)
    .option("--db <database>", "feature storage target: none, mongo, postgres, mysql, sqlite, redis")
    .option("--auth <auth>", "feature auth strategy: none, jwt, api-key, local")
    .option("--zone <zone>", "API zone: public, private, admin", "public")
    .option("--policy <policy>", "auth policy: admin, roles:a,b, custom:name, none")
    .option("--field <field>", "feature field metadata as name:type or name:type:optional", collect, [])
    .option("--crud-route <route>", "CRUD route override as operation:method:path[:auth][:zone][:bruno|no-bruno]", collect, [])
    .option("--dry-run", "print the expanded feature plan without writing files", false)
    .option("--bruno", "generate Bruno requests when Bruno is enabled", false)
    .option("--enable-bruno", "enable Bruno API client before adding the feature", false)
    .option("--yes", "run the expanded feature plan without prompting", false)
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)))
    .action(async (name: string, options: AddResourceOptions, command: Command) => {
      assertInteractiveTerminal(options);

      const rootContext = getCommandContext(command);
      const context = { ...rootContext, dryRun: rootContext.dryRun || Boolean(options.dryRun) };
      const config = await loadSoapConfig(context.cwd);
      const names = createNameVariants(name);

      if (config.registry.resources.some((resource) => resource.name === names.kebabName)) {
        throw new CliError(`Feature "${names.kebabName}" already exists.`);
      }

      const prompt = options.interactive ? new InquirerPromptAdapter() : undefined;
      const promptAnswers = prompt
        ? await promptAddResource(prompt, {
            config,
            provided: createProvidedAddResourceOptions(command),
          })
        : undefined;
      if (options.enableBruno || promptAnswers?.enableBruno) {
        enableBruno(config);
      }

      const resolved = addResourceResolver.resolve({
        flags: createExplicitAddResourceFlags(options, command),
        promptAnswers,
        projectConfig: config,
      });
      assertFeatureStorageSupported(resolved.db);

      const crudRoutes = parseCrudRouteMatrix(options.crudRoute);
      const policy = parseAuthPolicy(options.policy);
      assertAuthPolicyAllowed(policy, resolved.auth);
      assertCrudRouteMatrixCapabilities(crudRoutes, resolved.auth, config.project.capabilities.auth, config.project.zones);

      const resourcePlan = {
        name,
        crud: resolved.crud,
        db: resolved.db,
        auth: resolved.auth,
        zone: resolved.zone,
        featuresRoot: config.structure.featuresRoot,
        architecture: config.project.architecture,
        contracts: config.project.capabilities.contracts.includes("zod") ? "zod" as const : "plain" as const,
        fields: parseResourceFieldDefinitions(options.field),
        crudRoutes,
        policy,
      };
      const planningSummary = createResourceAddPlanningSummary({
        ...resourcePlan,
        architecture: config.project.architecture,
      });

      if (context.dryRun || promptAnswers?.dryRunFirst) {
        context.output.info(formatResourceAddPlanningSummary(planningSummary));
        context.output.success(`Planned feature ${names.kebabName} at /${names.pluralName}`);
        return;
      }

      if (options.interactive) {
        context.output.info(formatResourceAddPlanningSummary(planningSummary));

        if (!options.yes) {
          const confirmed = await prompt!.confirm({
            message: "Add feature?",
            defaultValue: true,
          });

          if (!confirmed) {
            context.output.warn("Feature generation aborted.");
            return;
          }
        }
      }

      const resource = createResourceEntry({
        ...resourcePlan,
      });

      config.registry.resources.push(resource);
      config.registry.routes.push(...createRouteEntries(resource, resolved.auth, resolved.zone, crudRoutes));

      const generatedPaths = config.registry.generatedFiles.map((file) => file.path);
      const existingRouteControllerIndexes = routeControllerIndexResources(generatedPaths, config.structure.featuresRoot, "");
      const usesCrudControllerIndex = resolved.crud;
      const routeControllerIndexes = usesCrudControllerIndex
        ? [...existingRouteControllerIndexes, resource.name]
        : existingRouteControllerIndexes;
      const mainControllerResources = config.registry.resources
        .filter((entry) => !routeControllerIndexes.includes(entry.name))
        .map((entry) => entry.name);
      const cqrsConfigFile = config.project.architecture === "cqrs" && resolved.crud
        ? createCqrsConfigFile(config.structure.featuresRoot, {
            commands: [
              ...config.registry.generatedFiles
                .map((file) => commandFeatureFromPath(file.path, config.structure.featuresRoot))
                .filter((feature): feature is string => Boolean(feature)),
              resource.name,
            ],
            queries: [
              ...config.registry.generatedFiles
                .map((file) => queryFeatureFromPath(file.path, config.structure.featuresRoot))
                .filter((feature): feature is string => Boolean(feature)),
              resource.name,
            ],
          })
        : undefined;
      const brunoEnabled = config.project.capabilities.apiClient.includes("bruno") || config.api.bruno.enabled;
      const shouldGenerateBruno = options.bruno || promptAnswers?.bruno || (brunoEnabled && !options.interactive);
      const brunoFiles = shouldGenerateBruno
        ? createBrunoFiles(config)
        : [];
      const files = [
        ...createResourceFiles(resourcePlan),
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
        ...(cqrsConfigFile ? [cqrsConfigFile] : []),
        ...brunoFiles,
      ];

      await writePlannedFiles(
        {
          root: config.root,
          files,
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
          onConflict: options.onConflict,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Added feature ${names.kebabName} at ${resource.path}`);
    });

  addConflictOption(addInteractiveOption(add
    .command("route [resource] [name]")
    .description("Add a route to an existing SoapJS project.")
    .option("--method <method>", "HTTP method: get, post, put, patch, delete, head, options", "get")
    .option("--path <path>", "absolute path under the resource path, or relative path segment")
    .option("--use-case <useCase>", "application use case to call from this route")
    .option("--command <command>", "CQRS command to dispatch from this route")
    .option("--query <query>", "CQRS query to dispatch from this route")
    .option("--auth <auth>", "route auth strategy: none, jwt, api-key, local")
    .option("--zone <zone>", "API zone: public, private, admin")
    .option("--policy <policy>", "auth policy: admin, roles:a,b, custom:name, none")
    .option("--bruno", "generate Bruno requests when Bruno is enabled", false)
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)))
    .action(async (resourceName: string | undefined, name: string | undefined, options: AddRouteOptions, command: Command) => {
      assertInteractiveTerminal(options);

      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);

      if (!options.interactive && (!resourceName || !name)) {
        throw new CliError("Resource and route name are required. Use `soap add route <resource> <name>`.");
      }

      if (options.interactive && config.registry.resources.length === 0) {
        throw new CliError("No features found. Run `soap add feature <name>` first.");
      }

      const initialResourceNames = resourceName ? createNameVariants(resourceName) : undefined;
      const initialResource = initialResourceNames
        ? config.registry.resources.find((entry) => entry.name === initialResourceNames.kebabName)
        : undefined;

      if (resourceName && !initialResource) {
        throw new CliError(`Feature "${initialResourceNames!.kebabName}" does not exist. Run \`soap add feature ${initialResourceNames!.kebabName}\` first.`);
      }

      const prompt = options.interactive ? new InquirerPromptAdapter() : undefined;
      const promptAnswers = prompt
        ? await promptAddRoute(prompt, {
            config,
            resource: initialResource,
            resourceName,
            routeName: name,
            provided: createProvidedAddRouteOptions(command, Boolean(resourceName), Boolean(name)),
          })
        : undefined;
      const resolvedResourceName = promptAnswers?.resourceName ?? initialResource!.name;
      const resolvedName = promptAnswers?.name ?? name!;
      const resourceNames = createNameVariants(resolvedResourceName);
      const routeNames = createNameVariants(resolvedName);
      const resource = config.registry.resources.find((entry) => entry.name === resourceNames.kebabName);

      if (!resource) {
        throw new CliError(`Feature "${resourceNames.kebabName}" does not exist. Run \`soap add feature ${resourceNames.kebabName}\` first.`);
      }

      if (config.registry.routes.some((route) => route.resource === resource.name && route.name === routeNames.kebabName)) {
        throw new CliError(`Route "${routeNames.kebabName}" already exists on resource "${resource.name}".`);
      }

      const resolved = addRouteResolver.resolve({
        flags: createExplicitAddRouteFlags(options, command),
        promptAnswers,
        projectConfig: { project: config, resource },
      });
      const policy = parseAuthPolicy(options.policy);
      assertAuthPolicyAllowed(policy, resolved.auth);

      const route = createRouteEntry({
        resource,
        name: resolvedName,
        method: resolved.method,
        path: resolved.path,
        useCase: resolved.useCase,
        command: resolved.command,
        query: resolved.query,
        auth: resolved.auth,
        zone: resolved.zone,
        policy,
        featuresRoot: config.structure.featuresRoot,
        contracts: config.project.capabilities.contracts.includes("zod") ? "zod" as const : "plain" as const,
      });
      config.registry.routes.push(route);

      const routePlan = {
        resource,
        name: resolvedName,
        method: resolved.method,
        path: resolved.path,
        useCase: resolved.useCase,
        command: resolved.command,
        query: resolved.query,
        auth: resolved.auth,
        zone: resolved.zone,
        policy,
        featuresRoot: config.structure.featuresRoot,
        contracts: config.project.capabilities.contracts.includes("zod") ? "zod" as const : "plain" as const,
      };
      const controllerFile = createRouteControllerFile(routePlan);
      const contractFile = createRouteContractFile(routePlan);
      const contractSpecFile = createRouteContractSpecFile(routePlan);
      const routeControllerNames = routeControllerNamesForResource(
        config.registry.generatedFiles.map((file) => file.path),
        config.structure.featuresRoot,
        resource.name,
        controllerFile.path
      );
      const routeControllerIndex = createRouteControllersIndexFile(resource, config.structure.featuresRoot, routeControllerNames);
      const controllerIndexes = routeControllerIndexResources(
        config.registry.generatedFiles.map((file) => file.path),
        config.structure.featuresRoot,
        resource.name
      );
      const controllersFile = createControllersFile(
        config.registry.resources,
        config.structure.featuresRoot,
        config.project.capabilities.auth,
        controllerIndexes
      );
      const brunoEnabled = config.project.capabilities.apiClient.includes("bruno") || config.api.bruno.enabled;
      const brunoFiles = options.bruno || promptAnswers?.bruno
        ? createBrunoFiles(config)
        : [];

      await writePlannedFiles(
        {
          root: config.root,
          files: [
            controllerFile,
            contractFile,
            contractSpecFile,
            routeControllerIndex,
            controllersFile,
            ...(brunoEnabled ? brunoFiles : []),
          ],
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
          onConflict: options.onConflict,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Added route ${route.method} ${route.path}`);
    });

  add
    .command("repository <name>")
    .description("Add a repository port and database adapter to a feature.")
    .requiredOption("--feature <feature>", "feature that owns the repository")
    .requiredOption("--db <database>", "database adapter: mongo, postgres, mysql, sqlite")
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)
    .action(async (name: string, options: AddRepositoryOptions, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const names = createNameVariants(name);
      const db = normalizeRepositoryDb(options.db);

      assertCapability("database", db, config.project.capabilities.databases);

      const files = createRepositoryFiles({
        name,
        feature: options.feature!,
        db,
        featuresRoot: config.structure.featuresRoot,
      });

      await writePlannedFiles(
        {
          root: config.root,
          files,
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Added ${db} repository ${names.kebabName}`);
    });

  add
    .command("entity <name>")
    .description("Add a domain entity to a feature.")
    .requiredOption("--feature <feature>", "feature that owns the entity")
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)
    .action(async (name: string, options: AddEntityOptions, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const names = createNameVariants(name);

      const files = createEntityFiles({
        name,
        feature: options.feature!,
        featuresRoot: config.structure.featuresRoot,
      });

      await writePlannedFiles(
        {
          root: config.root,
          files,
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Added entity ${names.kebabName}`);
    });

  add
    .command("use-case <name>")
    .description("Add an application use case to a feature.")
    .requiredOption("--feature <feature>", "feature that owns the use case")
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)
    .action(async (name: string, options: AddUseCaseOptions, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const names = createNameVariants(name);

      const files = createUseCaseFiles({
        name,
        feature: options.feature!,
        featuresRoot: config.structure.featuresRoot,
      });

      await writePlannedFiles(
        {
          root: config.root,
          files,
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Added use case ${names.kebabName}`);
    });

  add
    .command("command <name>")
    .description("Add a CQRS command and command handler to a feature.")
    .requiredOption("--feature <feature>", "feature that owns the command")
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)
    .action(async (name: string, options: AddCommandOptions, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const names = createNameVariants(name);
      const feature = createNameVariants(options.feature!).kebabName;

      if (config.project.architecture !== "cqrs") {
        throw new CliError("CQRS commands require a project created with `--architecture cqrs`.");
      }

      const commandFiles = createCommandFiles({
        name,
        feature,
        featuresRoot: config.structure.featuresRoot,
      });
      const commandNames = commandNamesForFeature(
        config.registry.generatedFiles.map((file) => file.path),
        config.structure.featuresRoot,
        feature,
        names.kebabName
      );
      const commandIndex = createCommandIndexFile(feature, config.structure.featuresRoot, commandNames);
      const cqrsFeatures = commandFeatures(
        config.registry.generatedFiles.map((file) => file.path),
        config.structure.featuresRoot,
        feature
      );
      const cqrsConfig = createCqrsConfigFile(config.structure.featuresRoot, {
        commands: cqrsFeatures,
        queries: queryFeatures(config.registry.generatedFiles.map((file) => file.path), config.structure.featuresRoot),
      });

      await writePlannedFiles(
        {
          root: config.root,
          files: [...commandFiles, commandIndex, cqrsConfig],
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Added command ${names.kebabName}`);
    });

  add
    .command("query <name>")
    .description("Add a CQRS query and query handler to a feature.")
    .requiredOption("--feature <feature>", "feature that owns the query")
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)
    .action(async (name: string, options: AddQueryOptions, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const names = createNameVariants(name);
      const feature = createNameVariants(options.feature!).kebabName;

      if (config.project.architecture !== "cqrs") {
        throw new CliError("CQRS queries require a project created with `--architecture cqrs`.");
      }

      const queryFiles = createQueryFiles({
        name,
        feature,
        featuresRoot: config.structure.featuresRoot,
      });
      const queryNames = queryNamesForFeature(
        config.registry.generatedFiles.map((file) => file.path),
        config.structure.featuresRoot,
        feature,
        names.kebabName
      );
      const queryIndex = createQueryIndexFile(feature, config.structure.featuresRoot, queryNames);
      const cqrsConfig = createCqrsConfigFile(config.structure.featuresRoot, {
        commands: commandFeatures(config.registry.generatedFiles.map((file) => file.path), config.structure.featuresRoot),
        queries: queryFeatures(config.registry.generatedFiles.map((file) => file.path), config.structure.featuresRoot, feature),
      });

      await writePlannedFiles(
        {
          root: config.root,
          files: [...queryFiles, queryIndex, cqrsConfig],
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Added query ${names.kebabName}`);
    });

  add
    .command("event <name>")
    .description("Add a domain event to a feature.")
    .requiredOption("--feature <feature>", "feature that owns the event")
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)
    .action(async (name: string, options: AddEventOptions, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);

      if (config.project.capabilities.messaging.length === 0) {
        throw new CliError("Messaging is not enabled for this project.");
      }

      const files = createEventFiles({
        name,
        feature: options.feature!,
        architecture: config.project.architecture,
        featuresRoot: config.structure.featuresRoot,
      });

      await writePlannedFiles(
        {
          root: config.root,
          files,
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Added event ${createNameVariants(name).kebabName}`);
    });

  add
    .command("socket <name>")
    .description("Add a WebSocket message handler to a feature.")
    .requiredOption("--feature <feature>", "feature that owns the socket handler")
    .option("--auth <auth>", "socket auth strategy placeholder: none, jwt, api-key, local", "none")
    .option("--force", "overwrite generated files even when modified", false)
    .option("--write-new", "write modified generated files as .new", false)
    .action(async (name: string, options: AddSocketOptions, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);

      if (!config.project.capabilities.realtime.includes("ws")) {
        throw new CliError("WebSocket support is not enabled. Create the project with `--realtime ws` first.");
      }

      const auth = normalizeRouteAuth(options.auth ?? "none");
      assertCapability("auth", auth, enabledRouteAuthValues(config.project.capabilities.auth));

      const files = await createSocketFiles(config.root, {
        name,
        feature: options.feature!,
        auth,
        featuresRoot: config.structure.featuresRoot,
      });

      await writePlannedFiles(
        {
          root: config.root,
          files,
          registry: config.registry,
          force: options.force,
          writeNew: options.writeNew,
        },
        context
      );
      await writeSoapConfig(config.root, config, context);

      context.output.success(`Added socket ${createNameVariants(name).kebabName}`);
    });
}

function firstOrNone<T extends string>(values: T[]): "none" | T {
  return values[0] ?? "none";
}

function firstAuthForRoutes(values: AuthCapability[]): "none" | AuthCapability | "jwt" {
  if (values.includes("jwt") || values.includes("local")) {
    return "jwt";
  }

  return values[0] ?? "none";
}

function normalizeRouteAuth(value: "none" | AuthCapability | "jwt"): "none" | "jwt" | "api-key" {
  if (value === "local") {
    return "jwt";
  }

  if (value === "jwt" || value === "api-key" || value === "none") {
    return value;
  }

  throw new CliError(`Auth "${value}" cannot protect routes. Use jwt, api-key, or none.`);
}

function normalizeRepositoryDb(value: string | undefined): Extract<DatabaseCapability, "mongo" | "postgres" | "mysql" | "sqlite"> {
  if (value === "mongo" || value === "postgres" || value === "mysql" || value === "sqlite") {
    return value;
  }

  throw new CliError("Repository database must be mongo, postgres, mysql, or sqlite.");
}

function enabledRouteAuthValues(values: AuthCapability[]): Array<"none" | "jwt" | "api-key"> {
  const allowed: Array<"none" | "jwt" | "api-key"> = ["none"];

  if (values.includes("jwt") || values.includes("local")) {
    allowed.push("jwt");
  }

  if (values.includes("api-key")) {
    allowed.push("api-key");
  }

  return allowed;
}

function assertCapability<T extends string>(label: string, value: string, allowed: readonly T[]): asserts value is T {
  if (!allowed.includes(value as T)) {
    const allowedValues = allowed.length > 0 ? allowed.join(", ") : "none";
    throw new CliError(`${label} "${value}" is not enabled for this project. Allowed values: ${allowedValues}.`);
  }
}

function createRouteEntries(
  resource: ReturnType<typeof createResourceEntry>,
  auth: "none" | AuthCapability,
  zone: ApiZone,
  matrix: CrudRouteMatrix = {}
): RouteRegistryEntry[] {
  const now = new Date().toISOString();
  const routes: Array<[keyof CrudRouteMatrix, string, string]> = [
    ["list", "GET", resource.path],
    ["get", "GET", `${resource.path}/:id`],
  ];

  if (resource.crud) {
    routes.push(
      ["create", "POST", resource.path],
      ["update", "PUT", `${resource.path}/:id`],
      ["delete", "DELETE", `${resource.path}/:id`]
    );
  }

  return routes.map(([name, defaultMethod, defaultPath]) => {
    const override = matrix[name];

    return {
      resource: resource.name,
      name,
      method: (override?.method ?? defaultMethod).toUpperCase(),
      path: resolveCrudRoutePath(resource.path, override?.path ?? defaultPath),
      auth: normalizeRouteAuth(override?.auth ?? auth),
      zone: override?.zone ?? zone,
      policy: override?.policy ?? resource.policy,
      bruno: override?.bruno ?? true,
      generatedAt: now,
    };
  });
}

function assertCrudRouteMatrixCapabilities(
  matrix: CrudRouteMatrix,
  defaultAuth: "none" | AuthCapability,
  authCapabilities: AuthCapability[],
  zones: ApiZone[]
): void {
  for (const config of Object.values(matrix)) {
    if (!config) {
      continue;
    }

    const routeAuth = normalizeRouteAuth(config.auth ?? defaultAuth);
    assertCapability("auth", routeAuth, enabledRouteAuthValues(authCapabilities));
    assertAuthPolicyAllowed(config.policy, routeAuth);

    if (config.zone) {
      assertCapability("zone", config.zone, zones);
    }
  }
}

function assertFeatureStorageSupported(db: "none" | DatabaseCapability): void {
  if (db === "redis") {
    throw new CliError("Redis is infrastructure-only and cannot generate a feature repository. Use --db none, mongo, postgres, mysql, or sqlite.");
  }
}

function assertAuthPolicyAllowed(policy: AuthPolicy | undefined, auth: "none" | AuthCapability): void {
  if (!policy) {
    return;
  }

  if (normalizeRouteAuth(auth) === "none") {
    throw new CliError("Auth policy requires route auth. Use --auth jwt or --auth api-key.");
  }
}

function resolveCrudRoutePath(resourcePath: string, routePath: string): string {
  if (routePath === resourcePath || routePath.startsWith(`${resourcePath}/`)) {
    return routePath;
  }

  if (routePath === "/") {
    return resourcePath;
  }

  return `${resourcePath}${routePath.startsWith("/") ? routePath : `/${routePath}`}`;
}

function normalizeRouteMethod(value: string): RouteMethod {
  const method = value.toLowerCase();

  if (!routeMethods.includes(method as RouteMethod)) {
    throw new CliError(`Unsupported HTTP method "${value}". Allowed values: ${routeMethods.join(", ")}.`);
  }

  return method as RouteMethod;
}

function assertSingleRouteTarget(options: Pick<AddRouteOptions, "useCase" | "command" | "query">): void {
  const targets = [options.useCase, options.command, options.query].filter(Boolean);

  if (targets.length > 1) {
    throw new CliError("Route target options are mutually exclusive. Use only one of --use-case, --command, or --query.");
  }
}

function createProvidedAddResourceOptions(command: Command): Record<string, boolean> {
  return {
    crud: isCliOption(command, "crud"),
    db: isCliOption(command, "db"),
    auth: isCliOption(command, "auth"),
    zone: isCliOption(command, "zone"),
    bruno: isCliOption(command, "bruno"),
    enableBruno: isCliOption(command, "enableBruno"),
    dryRunFirst: isCliOption(command, "dryRun"),
  };
}

function createExplicitAddResourceFlags(options: AddResourceOptions, command: Command): AddResourceOptions {
  return {
    crud: isCliOption(command, "crud") ? options.crud : undefined,
    db: isCliOption(command, "db") ? options.db : undefined,
    auth: isCliOption(command, "auth") ? options.auth : undefined,
    zone: isCliOption(command, "zone") ? options.zone : undefined,
  };
}

function createProvidedAddRouteOptions(
  command: Command,
  hasResourceName: boolean,
  hasRouteName: boolean
): Record<string, boolean> {
  return {
    resourceName: hasResourceName,
    name: hasRouteName,
    method: isCliOption(command, "method"),
    path: isCliOption(command, "path"),
    useCase: isCliOption(command, "useCase"),
    command: isCliOption(command, "command"),
    query: isCliOption(command, "query"),
    auth: isCliOption(command, "auth"),
    zone: isCliOption(command, "zone"),
    bruno: isCliOption(command, "bruno"),
  };
}

function createExplicitAddRouteFlags(options: AddRouteOptions, command: Command): AddRouteOptions {
  return {
    method: isCliOption(command, "method") ? options.method : undefined,
    path: isCliOption(command, "path") ? options.path : undefined,
    useCase: isCliOption(command, "useCase") ? options.useCase : undefined,
    command: isCliOption(command, "command") ? options.command : undefined,
    query: isCliOption(command, "query") ? options.query : undefined,
    auth: isCliOption(command, "auth") ? options.auth : undefined,
    zone: isCliOption(command, "zone") ? options.zone : undefined,
  };
}

function isCliOption(command: Command, name: string): boolean {
  return command.getOptionValueSource(name) === "cli";
}

function enableBruno(config: SoapConfig): void {
  if (!config.project.capabilities.apiClient.includes("bruno")) {
    config.project.capabilities.apiClient.push("bruno");
  }

  config.api.bruno.enabled = true;
  config.api.bruno.collectionPath ||= "bruno";
  config.api.bruno.environment ||= "Local";
}

function routeControllerNamesForResource(
  generatedPaths: string[],
  featuresRoot: string,
  resourceName: string,
  nextControllerPath: string
): string[] {
  const apiPrefix = `${featuresRoot}/${resourceName}/api/`;
  const routeControllerPaths = generatedPaths
    .filter((filePath) => filePath.startsWith(apiPrefix))
    .map(routeControllerNameFromPath)
    .filter((name): name is string => Boolean(name))
    .filter((name) => name !== resourceName);
  const nextName = routeControllerNameFromPath(nextControllerPath);

  if (nextName) {
    routeControllerPaths.push(nextName);
  }

  return Array.from(new Set(routeControllerPaths));
}

function routeControllerIndexResources(generatedPaths: string[], featuresRoot: string, nextResourceName?: string): string[] {
  const resources = generatedPaths
    .map((filePath) => routeControllerIndexResourceFromPath(filePath, featuresRoot))
    .filter((name): name is string => Boolean(name));

  if (nextResourceName) {
    resources.push(nextResourceName);
  }

  return Array.from(new Set(resources));
}

function commandNamesForFeature(
  generatedPaths: string[],
  featuresRoot: string,
  feature: string,
  nextCommandName: string
): string[] {
  const commandsPrefix = `${featuresRoot}/${feature}/application/commands/`;
  const names = generatedPaths
    .filter((filePath) => filePath.startsWith(commandsPrefix))
    .map(commandNameFromPath)
    .filter((name): name is string => Boolean(name));

  names.push(nextCommandName);

  return Array.from(new Set(names));
}

function commandFeatures(generatedPaths: string[], featuresRoot: string, nextFeature?: string): string[] {
  const features = generatedPaths
    .map((filePath) => commandFeatureFromPath(filePath, featuresRoot))
    .filter((name): name is string => Boolean(name));

  if (nextFeature) {
    features.push(nextFeature);
  }

  return Array.from(new Set(features));
}

function queryNamesForFeature(
  generatedPaths: string[],
  featuresRoot: string,
  feature: string,
  nextQueryName: string
): string[] {
  const queriesPrefix = `${featuresRoot}/${feature}/application/queries/`;
  const names = generatedPaths
    .filter((filePath) => filePath.startsWith(queriesPrefix))
    .map(queryNameFromPath)
    .filter((name): name is string => Boolean(name));

  names.push(nextQueryName);

  return Array.from(new Set(names));
}

function queryFeatures(generatedPaths: string[], featuresRoot: string, nextFeature?: string): string[] {
  const features = generatedPaths
    .map((filePath) => queryFeatureFromPath(filePath, featuresRoot))
    .filter((name): name is string => Boolean(name));

  if (nextFeature) {
    features.push(nextFeature);
  }

  return Array.from(new Set(features));
}

function collect(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}
