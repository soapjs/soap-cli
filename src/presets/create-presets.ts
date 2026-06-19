import { CliError } from "../core/errors";
import { CreatePreset } from "./preset.types";

export const createPresets: CreatePreset[] = [
  {
    name: "express-mongo-api",
    description: "Express API with MongoDB, JWT auth, OpenAPI docs, and Bruno requests.",
    config: {
      framework: "express",
      architecture: "regular",
      capabilities: {
        databases: ["mongo"],
        auth: ["jwt"],
        messaging: ["in-memory"],
        realtime: [],
        telemetry: ["logs"],
        docs: ["openapi"],
        contracts: [],
        apiClient: ["bruno"],
      },
      zones: ["public", "private", "admin"],
    },
  },
  {
    name: "express-postgres-api",
    description: "Express API with PostgreSQL, JWT auth, OpenAPI docs, and Bruno requests.",
    config: {
      framework: "express",
      architecture: "regular",
      capabilities: {
        databases: ["postgres"],
        auth: ["jwt"],
        messaging: ["in-memory"],
        realtime: [],
        telemetry: ["logs"],
        docs: ["openapi"],
        contracts: [],
        apiClient: ["bruno"],
      },
      zones: ["public", "private", "admin"],
    },
  },
  {
    name: "express-cqrs-kafka-api",
    description: "Express CQRS API with PostgreSQL, Kafka, JWT auth, OpenAPI docs, and Bruno requests.",
    config: {
      framework: "express",
      architecture: "cqrs",
      capabilities: {
        databases: ["postgres"],
        auth: ["jwt"],
        messaging: ["kafka"],
        realtime: [],
        telemetry: ["logs"],
        docs: ["openapi"],
        contracts: [],
        apiClient: ["bruno"],
      },
      zones: ["public", "private", "admin"],
    },
  },
  {
    name: "express-full-demo",
    description: "Express demo API with MongoDB, PostgreSQL, JWT, API key, Kafka, WebSocket, OpenAPI, and Bruno.",
    config: {
      framework: "express",
      architecture: "cqrs",
      capabilities: {
        databases: ["mongo", "postgres"],
        auth: ["jwt", "api-key"],
        messaging: ["kafka"],
        realtime: ["ws"],
        telemetry: ["logs", "otel-noop"],
        docs: ["openapi"],
        contracts: [],
        apiClient: ["bruno"],
      },
      zones: ["public", "private", "admin"],
    },
  },
];

export function resolveCreatePreset(name: string | undefined): CreatePreset | undefined {
  if (!name) {
    return undefined;
  }

  const preset = createPresets.find((candidate) => candidate.name === name);
  if (!preset) {
    throw new CliError(`Unknown create preset "${name}". Available presets: ${formatCreatePresetNames()}.`);
  }

  return preset;
}

export function formatCreatePresetNames(): string {
  return createPresets.map((preset) => preset.name).join(", ");
}
