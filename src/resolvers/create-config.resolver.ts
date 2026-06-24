import { PackageManager } from "../core/command-context";
import { CliError } from "../core/errors";
import {
  ApiClientCapability,
  ApiZone,
  Architecture,
  AuthCapability,
  ContractsCapability,
  ControllerLayout,
  DatabaseCapability,
  DocsCapability,
  MessagingCapability,
  ProjectCapabilities,
  RealtimeCapability,
  TelemetryCapability,
} from "../config/schemas/types";
import {
  authOptions,
  createDefaultCapabilities,
  databaseOptions,
  docsOptions,
  contractsOptions,
  messagingOptions,
  parseCsvOption,
  realtimeOptions,
  telemetryOptions,
  zonesOptions,
} from "../commands/create/project-plan";
import { CommandInputResolver } from "./resolver.types";

export interface CreateConfigInput {
  framework?: string;
  architecture?: Architecture;
  controllerLayout?: ControllerLayout;
  db?: string | string[];
  auth?: string | string[];
  messaging?: string | string[];
  telemetry?: string | string[];
  docs?: string | string[];
  contracts?: string | string[];
  apiClient?: string | string[];
  realtime?: string | string[];
  zones?: string | string[];
  packageManager?: PackageManager;
}

export interface CreateConfigResult {
  framework: "express";
  architecture: Architecture;
  controllerLayout: ControllerLayout;
  capabilities: ProjectCapabilities;
  zones: ApiZone[];
  packageManager?: PackageManager;
}

export class CreateConfigResolver
  implements CommandInputResolver<CreateConfigInput, CreateConfigInput, undefined, CreateConfigResult>
{
  resolve(input: {
    flags: CreateConfigInput;
    promptAnswers?: CreateConfigInput;
    preset?: Partial<CreateConfigResult>;
  }): CreateConfigResult {
    const flags = input.flags;
    const promptAnswers = input.promptAnswers ?? {};
    const preset = input.preset ?? {};
    const capabilities = createDefaultCapabilities();

    const framework = pick(flags.framework, promptAnswers.framework, preset.framework, "express");
    if (framework !== "express") {
      throw new CliError("Only framework \"express\" is supported.");
    }

    const architecture = pick(flags.architecture, promptAnswers.architecture, preset.architecture, "regular");
    if (architecture !== "regular" && architecture !== "cqrs") {
      throw new CliError("Architecture must be regular or cqrs.");
    }

    const controllerLayout = pick(flags.controllerLayout, promptAnswers.controllerLayout, preset.controllerLayout, "per-route");
    if (controllerLayout !== "per-route" && controllerLayout !== "per-feature") {
      throw new CliError("Controller layout must be per-route or per-feature.");
    }

    capabilities.databases = parseOptionList(
      pickList(flags.db, promptAnswers.db, preset.capabilities?.databases),
      databaseOptions,
      "database"
    );
    capabilities.auth = parseOptionList(pickList(flags.auth, promptAnswers.auth, preset.capabilities?.auth), authOptions, "auth");
    capabilities.messaging = parseOptionList(
      pickList(flags.messaging, promptAnswers.messaging, preset.capabilities?.messaging),
      messagingOptions,
      "messaging"
    );
    capabilities.telemetry = parseOptionList(
      pickList(flags.telemetry, promptAnswers.telemetry, preset.capabilities?.telemetry),
      telemetryOptions,
      "telemetry"
    );
    capabilities.docs = parseOptionList(pickList(flags.docs, promptAnswers.docs, preset.capabilities?.docs), docsOptions, "docs");
    capabilities.contracts = parseOptionList(
      pickList(flags.contracts, promptAnswers.contracts, preset.capabilities?.contracts),
      contractsOptions,
      "contracts"
    );
    capabilities.apiClient = parseOptionList(
      pickList(flags.apiClient, promptAnswers.apiClient, preset.capabilities?.apiClient),
      ["bruno"] as ApiClientCapability[],
      "api-client"
    );
    capabilities.realtime = parseOptionList(
      pickList(flags.realtime, promptAnswers.realtime, preset.capabilities?.realtime),
      realtimeOptions,
      "realtime"
    );

    if (capabilities.messaging.length === 0) capabilities.messaging = ["in-memory"];
    if (capabilities.telemetry.length === 0) capabilities.telemetry = ["logs"];

    const zones = parseOptionList(pick(flags.zones, promptAnswers.zones, preset.zones, "public,private,admin"), zonesOptions, "zone");

    return {
      framework,
      architecture,
      controllerLayout,
      capabilities,
      zones: zones.length > 0 ? zones : ["public", "private", "admin"],
      packageManager: pick(flags.packageManager, promptAnswers.packageManager, preset.packageManager),
    };
  }
}

function pick<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

function pickList<T extends string>(...values: Array<string | string[] | T[] | undefined>): string | string[] | undefined {
  return values.find((value) => value !== undefined && (!Array.isArray(value) || value.length > 0));
}

function parseOptionList<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  label: string
): T[] {
  try {
    return parseCsvOption(value, allowed);
  } catch (error) {
    throw new CliError(`Invalid ${label} option: ${(error as Error).message}`);
  }
}

export const createConfigResolver = new CreateConfigResolver();
