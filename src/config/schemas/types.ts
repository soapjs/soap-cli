import { PackageManager } from "../../core/command-context";

export type Framework = "express";
export type Architecture = "regular" | "cqrs";
export type Language = "typescript";
export type DatabaseCapability = "mongo" | "postgres" | "mysql" | "sqlite" | "redis";
export type AuthCapability = "jwt" | "api-key" | "local";
export type MessagingCapability = "in-memory" | "kafka";
export type RealtimeCapability = "ws";
export type TelemetryCapability = "logs" | "otel-noop" | "metrics" | "memory";
export type ApiClientCapability = "bruno";
export type DocsCapability = "openapi";
export type ContractsCapability = "zod";
export type ApiZone = "public" | "private" | "admin";
export type ControllerLayout = "per-route" | "per-feature";
export type ResourceFieldType = "string" | "number" | "boolean" | "date";

export interface ResourceFieldDefinition {
  name: string;
  type: ResourceFieldType;
  required: boolean;
}

export type AuthPolicy =
  | { type: "admin" }
  | { type: "roles"; roles: string[] }
  | { type: "custom"; name: string };

export interface ProjectCapabilities {
  databases: DatabaseCapability[];
  auth: AuthCapability[];
  messaging: MessagingCapability[];
  realtime: RealtimeCapability[];
  telemetry: TelemetryCapability[];
  apiClient: ApiClientCapability[];
  docs: DocsCapability[];
  contracts: ContractsCapability[];
}

export interface SoapProjectConfig {
  schemaVersion: 1;
  name: string;
  framework: Framework;
  architecture: Architecture;
  language: Language;
  packageManager: PackageManager;
  controllerLayout: ControllerLayout;
  capabilities: ProjectCapabilities;
  zones: ApiZone[];
}

export interface SoapStructureConfig {
  featuresRoot: string;
  commonRoot: string;
  configRoot: string;
  paths: {
    domain: string;
    application: string;
    ports: string;
    useCases: string;
    commands: string;
    queries: string;
    data: string;
    api: string;
    contracts: string;
    sockets: string;
  };
}

export interface SoapApiConfig {
  baseUrl: string;
  health: {
    method: "GET";
    path: string;
  };
  auth: {
    default: "none" | AuthCapability;
    loginRoute?: {
      method: "POST";
      path: string;
      tokenVariable: string;
    };
  };
  bruno: {
    enabled: boolean;
    collectionPath: string;
    environment: string;
  };
}

export type GeneratedFileType =
  | "project"
  | "resource"
  | "entity"
  | "use-case"
  | "repository"
  | "controller"
  | "route"
  | "bruno"
  | "docker"
  | "config";

export interface GeneratedFileEntry {
  path: string;
  type: GeneratedFileType;
  owner?: string;
  hash: string;
  generatedAt: string;
}

export interface ResourceRegistryEntry {
  name: string;
  path: string;
  crud: boolean;
  db: "none" | DatabaseCapability;
  auth: "none" | AuthCapability;
  zone: ApiZone;
  fields: ResourceFieldDefinition[];
  policy?: AuthPolicy;
  generatedAt: string;
}

export interface RouteRegistryEntry {
  resource: string;
  name: string;
  method: string;
  path: string;
  useCase?: string;
  command?: string;
  query?: string;
  auth: "none" | AuthCapability;
  zone: ApiZone;
  policy?: AuthPolicy;
  bruno?: boolean;
  generatedAt: string;
}

export interface SoapRegistryConfig {
  resources: ResourceRegistryEntry[];
  routes: RouteRegistryEntry[];
  generatedFiles: GeneratedFileEntry[];
}

export interface SoapConfig {
  root: string;
  project: SoapProjectConfig;
  structure: SoapStructureConfig;
  api: SoapApiConfig;
  registry: SoapRegistryConfig;
}
