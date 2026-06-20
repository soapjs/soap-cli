import { PackageManager } from "../core/command-context";
import {
  Architecture,
  AuthCapability,
  ContractsCapability,
  DatabaseCapability,
  MessagingCapability,
  RealtimeCapability,
  TelemetryCapability,
} from "../config/schemas/types";
import { PromptAdapter } from "./prompt-adapter";
import { CreateConfigInput, CreateConfigResult } from "../resolvers/create-config.resolver";

export interface CreateProjectPromptAnswers extends CreateConfigInput {
  install?: boolean;
  gitInit?: boolean;
}

export interface CreateProjectPromptOptions {
  provided: Partial<Record<keyof CreateProjectPromptAnswers, boolean>>;
  preset?: Partial<CreateConfigResult>;
}

export async function promptCreateProject(
  prompt: PromptAdapter,
  options: CreateProjectPromptOptions
): Promise<CreateProjectPromptAnswers> {
  const answers: CreateProjectPromptAnswers = {};
  const preset = options.preset ?? {};

  if (!options.provided.framework) {
    answers.framework = await prompt.select({
      message: "Web framework",
      choices: [{ label: "Express", value: "express" }],
      defaultValue: preset.framework ?? "express",
    });
  }

  if (!options.provided.architecture) {
    answers.architecture = await prompt.select<Architecture>({
      message: "Architecture pattern",
      choices: [
        { label: "Regular Clean Architecture", value: "regular" },
        { label: "CQRS", value: "cqrs" },
      ],
      defaultValue: preset.architecture ?? "regular",
    });
  }

  if (!options.provided.db) {
    answers.db = await prompt.multiSelect<DatabaseCapability | "none">({
      message: "Databases",
      choices: [
        { label: "MongoDB", value: "mongo" },
        { label: "PostgreSQL", value: "postgres" },
        { label: "MySQL", value: "mysql" },
        { label: "SQLite", value: "sqlite" },
        { label: "Redis", value: "redis" },
        { label: "None", value: "none" },
      ],
      defaultValues: withNoneDefault(preset.capabilities?.databases),
    });
  }

  if (!options.provided.auth) {
    answers.auth = await prompt.multiSelect<AuthCapability | "none">({
      message: "Auth strategies",
      choices: [
        { label: "JWT", value: "jwt" },
        { label: "API Key", value: "api-key" },
        { label: "Local", value: "local" },
        { label: "None", value: "none" },
      ],
      defaultValues: withNoneDefault(preset.capabilities?.auth),
    });
  }

  if (!options.provided.messaging) {
    answers.messaging = await prompt.multiSelect<MessagingCapability | "none">({
      message: "Messaging",
      choices: [
        { label: "In-memory", value: "in-memory" },
        { label: "Kafka/Redpanda", value: "kafka" },
        { label: "None", value: "none" },
      ],
      defaultValues: withDefault(preset.capabilities?.messaging, ["in-memory"]),
    });
  }

  if (!options.provided.realtime) {
    answers.realtime = await prompt.multiSelect<RealtimeCapability | "none">({
      message: "Realtime",
      choices: [
        { label: "WebSocket", value: "ws" },
        { label: "None", value: "none" },
      ],
      defaultValues: withNoneDefault(preset.capabilities?.realtime),
    });
  }

  if (!options.provided.telemetry) {
    answers.telemetry = await prompt.multiSelect<TelemetryCapability | "none">({
      message: "Telemetry",
      choices: [
        { label: "Logs", value: "logs" },
        { label: "OTel noop", value: "otel-noop" },
        { label: "Metrics endpoint", value: "metrics" },
        { label: "Memory monitoring", value: "memory" },
        { label: "None", value: "none" },
      ],
      defaultValues: withDefault(preset.capabilities?.telemetry, ["logs"]),
    });
  }

  if (!options.provided.docs) {
    answers.docs = await prompt.multiSelect<"openapi" | "none">({
      message: "Docs",
      choices: [
        { label: "OpenAPI", value: "openapi" },
        { label: "None", value: "none" },
      ],
      defaultValues: withNoneDefault(preset.capabilities?.docs),
    });
  }

  if (!options.provided.contracts) {
    answers.contracts = await prompt.multiSelect<ContractsCapability | "none">({
      message: "Contracts",
      choices: [
        { label: "Zod", value: "zod" },
        { label: "None", value: "none" },
      ],
      defaultValues: withNoneDefault(preset.capabilities?.contracts),
    });
  }

  if (!options.provided.apiClient) {
    answers.apiClient = await prompt.multiSelect<"bruno" | "none">({
      message: "API client",
      choices: [
        { label: "Bruno", value: "bruno" },
        { label: "None", value: "none" },
      ],
      defaultValues: withNoneDefault(preset.capabilities?.apiClient),
    });
  }

  if (!options.provided.zones) {
    answers.zones = await prompt.multiSelect<"public" | "private" | "admin">({
      message: "API zones",
      choices: [
        { label: "Public", value: "public" },
        { label: "Private", value: "private" },
        { label: "Admin", value: "admin" },
      ],
      defaultValues: withDefault(preset.zones, ["public", "private", "admin"]),
      required: true,
    });
  }

  if (!options.provided.packageManager) {
    answers.packageManager = await prompt.select<PackageManager>({
      message: "Package manager",
      choices: [
        { label: "npm", value: "npm" },
        { label: "pnpm", value: "pnpm" },
        { label: "yarn", value: "yarn" },
        { label: "bun", value: "bun" },
      ],
      defaultValue: preset.packageManager ?? "npm",
    });
  }

  if (!options.provided.install) {
    answers.install = await prompt.confirm({
      message: "Install dependencies",
      defaultValue: false,
    });
  }

  if (!options.provided.gitInit) {
    answers.gitInit = await prompt.confirm({
      message: "Initialize git repository",
      defaultValue: false,
    });
  }

  return answers;
}

function withNoneDefault<T extends string>(values: T[] | undefined): Array<T | "none"> {
  return values && values.length > 0 ? values : [];
}

function withDefault<T extends string>(values: T[] | undefined, fallback: T[]): T[] {
  return values && values.length > 0 ? values : fallback;
}
