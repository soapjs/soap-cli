import { ApiZone, AuthCapability, DatabaseCapability, SoapConfig } from "../config/schemas/types";
import { AddResourceInput } from "../resolvers/add-resource.resolver";
import { PromptAdapter } from "./prompt-adapter";
import { PromptChoice } from "./prompt.types";

export interface AddResourcePromptAnswers extends AddResourceInput {
  bruno?: boolean;
  enableBruno?: boolean;
  dryRunFirst?: boolean;
}

export interface AddResourcePromptOptions {
  config: SoapConfig;
  provided: Partial<Record<keyof AddResourcePromptAnswers, boolean>>;
}

export async function promptAddResource(
  prompt: PromptAdapter,
  options: AddResourcePromptOptions
): Promise<AddResourcePromptAnswers> {
  const answers: AddResourcePromptAnswers = {};
  const config = options.config;

  if (!options.provided.crud) {
    answers.crud = await prompt.confirm({
      message: "Generate CRUD routes",
      defaultValue: true,
    });
  }

  if (!options.provided.db) {
    answers.db = await prompt.select<"none" | DatabaseCapability>({
      message: "Storage",
      choices: createDatabaseChoices(config),
      defaultValue: config.project.capabilities.databases[0] ?? "none",
    });
  }

  if (!options.provided.auth) {
    answers.auth = await prompt.select<"none" | "jwt" | "api-key">({
      message: "Route auth",
      choices: createAuthChoices(config),
      defaultValue: defaultRouteAuth(config.project.capabilities.auth),
    });
  }

  if (!options.provided.zone) {
    answers.zone = await prompt.select<ApiZone>({
      message: "API zone",
      choices: config.project.zones.map((zone) => ({ label: zone, value: zone })),
      defaultValue: config.project.zones.includes("public") ? "public" : config.project.zones[0],
    });
  }

  const brunoEnabled = config.project.capabilities.apiClient.includes("bruno") || config.api.bruno.enabled;
  if (brunoEnabled && !options.provided.bruno) {
    answers.bruno = await prompt.confirm({
      message: "Generate Bruno requests",
      defaultValue: true,
    });
  }

  if (!brunoEnabled && !options.provided.enableBruno) {
    answers.enableBruno = await prompt.confirm({
      message: "Enable Bruno now",
      defaultValue: false,
    });
  }

  if (!options.provided.dryRunFirst) {
    answers.dryRunFirst = await prompt.confirm({
      message: "Run as dry-run first",
      defaultValue: false,
    });
  }

  return answers;
}

function createDatabaseChoices(config: SoapConfig): Array<PromptChoice<"none" | DatabaseCapability>> {
  return [
    { label: "None", value: "none" },
    ...config.project.capabilities.databases.map((database) => ({ label: database, value: database })),
  ];
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

function defaultRouteAuth(values: AuthCapability[]): "none" | "jwt" | "api-key" {
  if (values.includes("jwt") || values.includes("local")) {
    return "jwt";
  }

  if (values.includes("api-key")) {
    return "api-key";
  }

  return "none";
}
