import { ApiZone, AuthCapability, ResourceRegistryEntry, SoapConfig } from "../config/schemas/types";
import { RouteMethod, routeMethods } from "../commands/add/route-plan";
import { AddRouteInput } from "../resolvers/add-route.resolver";
import { createNameVariants } from "../templates/naming";
import { PromptAdapter } from "./prompt-adapter";
import { PromptChoice } from "./prompt.types";

export interface AddRoutePromptAnswers extends AddRouteInput {
  resourceName?: string;
  name?: string;
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

  const brunoEnabled = config.project.capabilities.apiClient.includes("bruno") || config.api.bruno.enabled;
  if (brunoEnabled && !options.provided.bruno) {
    answers.bruno = await prompt.confirm({
      message: "Generate Bruno request",
      defaultValue: true,
    });
  }

  return answers;
}

async function promptForResource(
  prompt: PromptAdapter,
  config: SoapConfig,
  provided: boolean | undefined
): Promise<ResourceRegistryEntry> {
  if (provided) {
    throw new Error("Resource was marked as provided but no resource entry was passed.");
  }

  const value = await prompt.select<string>({
    message: "Resource",
    choices: config.registry.resources.map((resource) => ({
      label: `${resource.name} (${resource.path})`,
      value: resource.name,
    })),
  });
  const resource = config.registry.resources.find((entry) => entry.name === value);

  if (!resource) {
    throw new Error(`Selected resource "${value}" was not found.`);
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
