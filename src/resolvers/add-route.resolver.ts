import { ApiZone, AuthCapability, ResourceRegistryEntry, SoapConfig } from "../config/schemas/types";
import { CliError } from "../core/errors";
import { RouteMethod, routeMethods } from "../commands/add/route-plan";
import { CommandInputResolver } from "./resolver.types";

export interface AddRouteInput {
  method?: string;
  path?: string;
  useCase?: string;
  command?: string;
  query?: string;
  auth?: "none" | AuthCapability | "jwt";
  zone?: ApiZone;
}

export interface AddRouteConfig {
  project: SoapConfig;
  resource: ResourceRegistryEntry;
}

export interface AddRouteResult {
  method: RouteMethod;
  path?: string;
  useCase?: string;
  command?: string;
  query?: string;
  auth: "none" | "jwt" | "api-key";
  zone: ApiZone;
}

export class AddRouteResolver
  implements CommandInputResolver<AddRouteInput, AddRouteInput, AddRouteConfig, AddRouteResult>
{
  resolve(input: {
    flags: AddRouteInput;
    promptAnswers?: AddRouteInput;
    projectConfig?: AddRouteConfig;
    preset?: Partial<AddRouteResult>;
  }): AddRouteResult {
    const config = requireRouteConfig(input.projectConfig);
    const flags = input.flags;
    const promptAnswers = input.promptAnswers ?? {};
    const preset = input.preset ?? {};
    const method = normalizeRouteMethod(pick(flags.method, promptAnswers.method, preset.method, "get"));
    const auth = normalizeRouteAuth(pick(flags.auth, promptAnswers.auth, preset.auth, config.resource.auth));
    const zone = pick(flags.zone, promptAnswers.zone, preset.zone, config.resource.zone);
    const useCase = pick(flags.useCase, promptAnswers.useCase, preset.useCase);
    const command = pick(flags.command, promptAnswers.command, preset.command);
    const query = pick(flags.query, promptAnswers.query, preset.query);

    assertSingleRouteTarget({ useCase, command, query });
    if ((command || query) && config.project.project.architecture !== "cqrs") {
      throw new CliError("CQRS route targets require a project created with `--architecture cqrs`.");
    }

    assertCapability("auth", auth, enabledRouteAuthValues(config.project.project.capabilities.auth));
    assertCapability("zone", zone, config.project.project.zones);

    return {
      method,
      path: pick(flags.path, promptAnswers.path, preset.path),
      useCase,
      command,
      query,
      auth,
      zone,
    };
  }
}

function requireRouteConfig(config: AddRouteConfig | undefined): AddRouteConfig {
  if (!config) {
    throw new CliError("Project and resource config are required to resolve route input.");
  }

  return config;
}

function pick<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((item) => item !== undefined);
}

function normalizeRouteMethod(value: string | undefined): RouteMethod {
  const method = (value ?? "get").toLowerCase();

  if (!routeMethods.includes(method as RouteMethod)) {
    throw new CliError(`Unsupported HTTP method "${value}". Allowed values: ${routeMethods.join(", ")}.`);
  }

  return method as RouteMethod;
}

function normalizeRouteAuth(value: "none" | AuthCapability | "jwt" | undefined): "none" | "jwt" | "api-key" {
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

function assertCapability<T extends string>(label: string, value: string, allowed: readonly T[]): asserts value is T {
  if (!allowed.includes(value as T)) {
    const allowedValues = allowed.length > 0 ? allowed.join(", ") : "none";
    throw new CliError(`${label} "${value}" is not enabled for this project. Allowed values: ${allowedValues}.`);
  }
}

function assertSingleRouteTarget(options: Pick<AddRouteResult, "useCase" | "command" | "query">): void {
  const targets = [options.useCase, options.command, options.query].filter(Boolean);

  if (targets.length > 1) {
    throw new CliError("Route target options are mutually exclusive. Use only one of --use-case, --command, or --query.");
  }
}

export const addRouteResolver = new AddRouteResolver();
