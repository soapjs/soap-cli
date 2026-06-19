import { ApiZone, AuthCapability, DatabaseCapability, SoapConfig } from "../config/schemas/types";
import { CliError } from "../core/errors";
import { CommandInputResolver } from "./resolver.types";

export interface AddResourceInput {
  crud?: boolean;
  db?: "none" | DatabaseCapability;
  auth?: "none" | AuthCapability | "jwt";
  zone?: ApiZone;
}

export interface AddResourceResult {
  crud: boolean;
  db: "none" | DatabaseCapability;
  auth: "none" | "jwt" | "api-key";
  zone: ApiZone;
}

export class AddResourceResolver
  implements CommandInputResolver<AddResourceInput, AddResourceInput, SoapConfig, AddResourceResult>
{
  resolve(input: {
    flags: AddResourceInput;
    promptAnswers?: AddResourceInput;
    projectConfig?: SoapConfig;
    preset?: Partial<AddResourceResult>;
  }): AddResourceResult {
    const config = requireProjectConfig(input.projectConfig);
    const flags = input.flags;
    const promptAnswers = input.promptAnswers ?? {};
    const preset = input.preset ?? {};

    const db = pick(flags.db, promptAnswers.db, preset.db, firstOrNone(config.project.capabilities.databases));
    const auth = normalizeRouteAuth(pick(flags.auth, promptAnswers.auth, preset.auth, firstAuthForRoutes(config.project.capabilities.auth)));
    const zone = pick(flags.zone, promptAnswers.zone, preset.zone, defaultZone(config));

    assertCapability("database", db, ["none", ...config.project.capabilities.databases]);
    assertCapability("auth", auth, enabledRouteAuthValues(config.project.capabilities.auth));
    assertCapability("zone", zone, config.project.zones);

    return {
      crud: Boolean(pick(flags.crud, promptAnswers.crud, preset.crud, false)),
      db,
      auth,
      zone,
    };
  }
}

function requireProjectConfig(config: SoapConfig | undefined): SoapConfig {
  if (!config) {
    throw new CliError("Project config is required to resolve resource input.");
  }

  return config;
}

function pick<T>(...values: Array<T | undefined>): T {
  const value = values.find((item) => item !== undefined);
  return value as T;
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

function defaultZone(config: SoapConfig): ApiZone {
  return config.project.zones.includes("public") ? "public" : config.project.zones[0] ?? "public";
}

function assertCapability<T extends string>(label: string, value: string, allowed: readonly T[]): asserts value is T {
  if (!allowed.includes(value as T)) {
    const allowedValues = allowed.length > 0 ? allowed.join(", ") : "none";
    throw new CliError(`${label} "${value}" is not enabled for this project. Allowed values: ${allowedValues}.`);
  }
}

export const addResourceResolver = new AddResourceResolver();
