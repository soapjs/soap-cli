import { ApiZone, AuthCapability, ResourceRegistryEntry, SoapConfig } from "../config/schemas/types";
import { RouteMethod, routeControllerNameFromPath, routeMethods } from "../commands/add/route-plan";
import { AddRouteInput } from "../resolvers/add-route.resolver";
import { createNameVariants } from "../templates/naming";
import { PromptAdapter } from "./prompt-adapter";
import { PromptChoice } from "./prompt.types";

export interface AddRoutePromptAnswers extends AddRouteInput {
  resourceName?: string;
  name?: string;
  controller?: string;
  bruno?: boolean;
}

export interface AddRoutePromptOptions {
  config: SoapConfig;
  resource?: ResourceRegistryEntry;
  resourceName?: string;
  routeName?: string;
  provided: Partial<Record<keyof AddRoutePromptAnswers, boolean>>;
}

export async function promptAddRoute(
  prompt: PromptAdapter,
  options: AddRoutePromptOptions
): Promise<AddRoutePromptAnswers> {
  const answers: AddRoutePromptAnswers = {};
  const config = options.config;
  const resource = options.resource ?? await promptForResource(prompt, config, options.provided.resourceName);
  const routeName = options.routeName ?? await promptForRouteName(prompt, options.provided.name);

  if (!options.resourceName) {
    answers.resourceName = resource.name;
  }

  if (!options.routeName) {
    answers.name = routeName;
  }

  if (!options.provided.method) {
    answers.method = await prompt.select<RouteMethod>({
      message: "HTTP method",
      choices: routeMethods.map((method) => ({ label: method.toUpperCase(), value: method })),
      defaultValue: "get",
    });
  }

  if (!options.provided.path) {
    answers.path = await prompt.input({
      message: "Route path",
      defaultValue: createNameVariants(routeName).kebabName,
    });
  }

  if (!options.provided.zone) {
    answers.zone = await prompt.select<ApiZone>({
      message: "API zone",
      choices: config.project.zones.map((zone) => ({ label: zone, value: zone })),
      defaultValue: resource.zone,
    });
  }

  if (!options.provided.auth) {
    answers.auth = await prompt.select<"none" | "jwt" | "api-key">({
      message: "Route auth",
      choices: createAuthChoices(config),
      defaultValue: defaultRouteAuth(resource.auth, config.project.capabilities.auth),
    });
  }

  if (!options.provided.useCase && !options.provided.command && !options.provided.query) {
    const target = await prompt.select<"direct" | "use-case" | "command" | "query">({
      message: "Route target",
      choices: createTargetChoices(config),
      defaultValue: "direct",
    });

    if (target === "use-case") {
      answers.useCase = await prompt.input({
        message: "Use case name",
        defaultValue: routeName,
      });
    }

    if (target === "command") {
      answers.command = await prompt.input({
        message: "Command name",
        defaultValue: routeName,
      });
    }

    if (target === "query") {
      answers.query = await prompt.input({
        message: "Query name",
        defaultValue: routeName,
      });
    }
  }

  if (!options.provided.controller) {
    const controller = await promptForController(prompt, config, resource, routeName);
    if (controller) {
      answers.controller = controller;
    }
  }

  const brunoEnabled = config.project.capabilities.apiClient.includes("bruno") || config.api.bruno.enabled;
  if (brunoEnabled && !options.provided.bruno) {
    answers.bruno = await prompt.confirm({
      message: "Generate Bruno request",
      defaultValue: true,
    });
  }

  return answers;
}

async function promptForController(
  prompt: PromptAdapter,
  config: SoapConfig,
  resource: ResourceRegistryEntry,
  routeName: string
): Promise<string | undefined> {
  const controllers = controllerNamesForResource(config, resource.name);

  if (controllers.length === 0) {
    return undefined;
  }

  const routeNames = createNameVariants(routeName);
  const newRouteController = `__new_route_controller__:${routeNames.kebabName}`;
  const defaultValue = controllers.includes(resource.name) ? resource.name : newRouteController;
  const value = await prompt.select<string>({
    message: "Controller",
    choices: [
      ...controllers.map((controller) => ({
        label: controller === resource.name ? `Existing feature controller: ${controller}` : `Existing controller: ${controller}`,
        value: controller,
      })),
      {
        label: `New route controller: ${routeNames.kebabName}`,
        value: newRouteController,
      },
    ],
    defaultValue,
  });

  return value === newRouteController ? undefined : value;
}

function controllerNamesForResource(config: SoapConfig, resourceName: string): string[] {
  const apiPrefix = `${config.structure.featuresRoot}/${resourceName}/api/`;
  return Array.from(new Set(config.registry.generatedFiles
    .filter((file) => file.path.startsWith(apiPrefix))
    .map((file) => routeControllerNameFromPath(file.path))
    .filter((name): name is string => Boolean(name))
  )).sort();
}

async function promptForResource(
  prompt: PromptAdapter,
  config: SoapConfig,
  provided: boolean | undefined
): Promise<ResourceRegistryEntry> {
  if (provided) {
    throw new Error("Feature was marked as provided but no feature entry was passed.");
  }

  const value = await prompt.select<string>({
    message: "Feature",
    choices: config.registry.resources.map((resource) => ({
      label: `${resource.name} (${resource.path})`,
      value: resource.name,
    })),
  });
  const resource = config.registry.resources.find((entry) => entry.name === value);

  if (!resource) {
    throw new Error(`Selected feature "${value}" was not found.`);
  }

  return resource;
}

async function promptForRouteName(prompt: PromptAdapter, provided: boolean | undefined): Promise<string> {
  if (provided) {
    throw new Error("Route name was marked as provided but no route name was passed.");
  }

  return prompt.input({
    message: "Route name",
    required: true,
  });
}

function createAuthChoices(config: SoapConfig): Array<PromptChoice<"none" | "jwt" | "api-key">> {
  const choices: Array<PromptChoice<"none" | "jwt" | "api-key">> = [{ label: "None", value: "none" }];

  if (config.project.capabilities.auth.includes("jwt") || config.project.capabilities.auth.includes("local")) {
    choices.push({ label: "JWT", value: "jwt" });
  }

  if (config.project.capabilities.auth.includes("api-key")) {
    choices.push({ label: "API key", value: "api-key" });
  }

  return choices;
}

function defaultRouteAuth(
  resourceAuth: "none" | AuthCapability,
  projectAuth: AuthCapability[]
): "none" | "jwt" | "api-key" {
  if (resourceAuth === "local" || resourceAuth === "jwt") {
    return "jwt";
  }

  if (resourceAuth === "api-key") {
    return "api-key";
  }

  if (projectAuth.includes("jwt") || projectAuth.includes("local")) {
    return "jwt";
  }

  if (projectAuth.includes("api-key")) {
    return "api-key";
  }

  return "none";
}

function createTargetChoices(config: SoapConfig): Array<PromptChoice<"direct" | "use-case" | "command" | "query">> {
  const choices: Array<PromptChoice<"direct" | "use-case" | "command" | "query">> = [
    { label: "Direct controller", value: "direct" },
    { label: "Use case", value: "use-case" },
  ];

  if (config.project.architecture === "cqrs") {
    choices.push({ label: "CQRS command", value: "command" });
    choices.push({ label: "CQRS query", value: "query" });
  }

  return choices;
}
