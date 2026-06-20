import { CliError } from "../../core/errors";
import { PackageManager } from "../../core/command-context";
import {
  ApiZone,
  Architecture,
  AuthCapability,
  AuthPolicy,
  DatabaseCapability,
  DocsCapability,
  ContractsCapability,
  Framework,
  MessagingCapability,
  RealtimeCapability,
  SoapApiConfig,
  SoapProjectConfig,
  SoapRegistryConfig,
  SoapStructureConfig,
  TelemetryCapability,
} from "./types";

const frameworks: Framework[] = ["express"];
const architectures: Architecture[] = ["regular", "cqrs"];
const packageManagers: PackageManager[] = ["npm", "pnpm", "yarn", "bun"];
const databases: DatabaseCapability[] = ["mongo", "postgres", "mysql", "sqlite", "redis"];
const auth: AuthCapability[] = ["jwt", "api-key", "local"];
const messaging: MessagingCapability[] = ["in-memory", "kafka"];
const realtime: RealtimeCapability[] = ["ws"];
const telemetry: TelemetryCapability[] = ["logs", "otel-noop", "metrics", "memory"];
const apiClients = ["bruno"];
const docs: DocsCapability[] = ["openapi"];
const contracts: ContractsCapability[] = ["zod"];
const zones: ApiZone[] = ["public", "private", "admin"];

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CliError(`${label} must be an object.`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CliError(`${label} must be a non-empty string.`);
  }
}

function assertArrayOf<T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[]
): asserts value is T[] {
  if (!Array.isArray(value)) {
    throw new CliError(`${label} must be an array.`);
  }

  const invalid = value.find((item) => typeof item !== "string" || !allowed.includes(item as T));
  if (invalid) {
    throw new CliError(`${label} contains unsupported value "${String(invalid)}".`);
  }
}

function assertOneOf<T extends string>(value: unknown, label: string, allowed: readonly T[]): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new CliError(`${label} must be one of: ${allowed.join(", ")}.`);
  }
}

export function validateProjectConfig(value: unknown): SoapProjectConfig {
  assertObject(value, ".soap/project.json");

  if (value.schemaVersion !== 1) {
    throw new CliError(".soap/project.json schemaVersion must be 1.");
  }

  assertString(value.name, "project.name");
  assertOneOf(value.framework, "project.framework", frameworks);
  assertOneOf(value.architecture, "project.architecture", architectures);

  if (value.language !== "typescript") {
    throw new CliError("project.language must be typescript.");
  }

  assertOneOf(value.packageManager, "project.packageManager", packageManagers);
  assertObject(value.capabilities, "project.capabilities");

  assertArrayOf(value.capabilities.databases, "project.capabilities.databases", databases);
  assertArrayOf(value.capabilities.auth, "project.capabilities.auth", auth);
  assertArrayOf(value.capabilities.messaging, "project.capabilities.messaging", messaging);
  assertArrayOf(value.capabilities.realtime, "project.capabilities.realtime", realtime);
  assertArrayOf(value.capabilities.telemetry, "project.capabilities.telemetry", telemetry);
  assertArrayOf(value.capabilities.apiClient, "project.capabilities.apiClient", apiClients);
  assertArrayOf(value.capabilities.docs, "project.capabilities.docs", docs);
  if (!Array.isArray(value.capabilities.contracts)) {
    value.capabilities.contracts = [];
  }
  assertArrayOf(value.capabilities.contracts, "project.capabilities.contracts", contracts);
  assertArrayOf(value.zones, "project.zones", zones);

  return value as unknown as SoapProjectConfig;
}

export function validateStructureConfig(value: unknown): SoapStructureConfig {
  assertObject(value, ".soap/structure.json");
  assertString(value.featuresRoot, "structure.featuresRoot");
  assertString(value.commonRoot, "structure.commonRoot");
  assertString(value.configRoot, "structure.configRoot");
  assertObject(value.paths, "structure.paths");

  return value as unknown as SoapStructureConfig;
}

export function validateApiConfig(value: unknown): SoapApiConfig {
  assertObject(value, ".soap/api.json");
  assertString(value.baseUrl, "api.baseUrl");
  assertObject(value.health, "api.health");
  assertObject(value.auth, "api.auth");
  assertObject(value.bruno, "api.bruno");

  return value as unknown as SoapApiConfig;
}

export function validateRegistryConfig(value: unknown): SoapRegistryConfig {
  assertObject(value, ".soap/registry.json");

  if (!Array.isArray(value.resources) || !Array.isArray(value.routes) || !Array.isArray(value.generatedFiles)) {
    throw new CliError(".soap/registry.json must contain resources, routes, and generatedFiles arrays.");
  }

  for (const resource of value.resources) {
    if (resource && typeof resource === "object" && !Array.isArray(resource) && !Array.isArray((resource as Record<string, unknown>).fields)) {
      (resource as Record<string, unknown>).fields = [];
    }
    if (resource && typeof resource === "object" && !Array.isArray(resource)) {
      assertAuthPolicy((resource as Record<string, unknown>).policy, "resource.policy");
    }
  }
  for (const route of value.routes) {
    if (route && typeof route === "object" && !Array.isArray(route) && typeof (route as Record<string, unknown>).bruno !== "boolean") {
      (route as Record<string, unknown>).bruno = true;
    }
    if (route && typeof route === "object" && !Array.isArray(route)) {
      assertAuthPolicy((route as Record<string, unknown>).policy, "route.policy");
    }
  }

  return value as unknown as SoapRegistryConfig;
}

function assertAuthPolicy(value: unknown, label: string): asserts value is AuthPolicy | undefined {
  if (value === undefined) {
    return;
  }

  assertObject(value, label);

  if (value.type === "admin") {
    return;
  }

  if (value.type === "roles") {
    if (!Array.isArray(value.roles) || value.roles.some((role) => typeof role !== "string" || role.trim() === "")) {
      throw new CliError(`${label}.roles must contain non-empty strings.`);
    }
    return;
  }

  if (value.type === "custom") {
    assertString(value.name, `${label}.name`);
    return;
  }

  throw new CliError(`${label}.type must be admin, roles, or custom.`);
}
