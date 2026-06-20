import { ProjectCapabilities } from "../config/schemas/types";

export interface ResolvedDependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export function resolveDependencies(capabilities: ProjectCapabilities): ResolvedDependencies {
  const dependencies: Record<string, string> = {
    "@soapjs/soap": "^0.14.0",
    "@soapjs/soap-express": "^0.6.0",
    dotenv: "^16.4.5",
    express: "^4.18.2",
    "reflect-metadata": "^0.2.2",
  };

  const devDependencies: Record<string, string> = {
    "@types/express": "^4.17.21",
    "@types/node": "^24.0.0",
    tsx: "^4.7.1",
    typescript: "^5.4.0",
  };

  if (capabilities.databases.includes("mongo")) {
    dependencies["@soapjs/soap-node-mongo"] = "^0.7.1";
    dependencies.mongodb = "^6.3.0";
  }

  if (capabilities.databases.includes("postgres") || capabilities.databases.includes("mysql") || capabilities.databases.includes("sqlite")) {
    dependencies["@soapjs/soap-node-sql"] = "^0.2.1";
  }

  if (capabilities.databases.includes("postgres")) {
    dependencies.pg = "^8.11.3";
    devDependencies["@types/pg"] = "^8.11.6";
  }

  if (capabilities.databases.includes("mysql")) {
    dependencies.mysql2 = "^3.11.0";
  }

  if (capabilities.databases.includes("sqlite")) {
    dependencies["better-sqlite3"] = "^11.1.2";
    devDependencies["@types/better-sqlite3"] = "^7.6.11";
  }

  if (capabilities.databases.includes("redis")) {
    dependencies["@soapjs/soap-node-redis"] = "^0.1.1";
    dependencies.redis = "^4.6.13";
  }

  if (capabilities.auth.length > 0) {
    dependencies["@soapjs/soap-auth"] = "^1.0.1";
  }

  if (capabilities.messaging.includes("kafka")) {
    dependencies["@soapjs/soap-node-kafka"] = "^0.1.3";
    dependencies.kafkajs = "^2.2.4";
  }

  if (capabilities.realtime.includes("ws")) {
    dependencies["@soapjs/soap-node-socket"] = "^0.0.3";
    dependencies.ws = "^8.16.0";
    devDependencies["@types/ws"] = "^8.5.10";
  }

  if (capabilities.telemetry.includes("otel-noop")) {
    dependencies["@soapjs/soap-node-otel"] = "^0.1.3";
  }

  if (capabilities.docs.includes("openapi")) {
    dependencies["@soapjs/soap-openapi"] = "^0.1.1";
  }

  if (capabilities.contracts.includes("zod")) {
    dependencies.zod = "^3.23.8";
  }

  if (capabilities.apiClient.includes("bruno")) {
    devDependencies["@usebruno/cli"] = "^3.4.2";
  }

  return { dependencies, devDependencies };
}
