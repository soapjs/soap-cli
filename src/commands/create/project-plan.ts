import path from "path";
import { PackageManager } from "../../core/command-context";
import {
  ApiZone,
  Architecture,
  AuthCapability,
  ContractsCapability,
  DatabaseCapability,
  DocsCapability,
  MessagingCapability,
  ProjectCapabilities,
  RealtimeCapability,
  SoapApiConfig,
  SoapProjectConfig,
  SoapRegistryConfig,
  SoapStructureConfig,
  TelemetryCapability,
} from "../../config/schemas/types";
import { ResolvedDependencies } from "../../dependencies/dependency-resolver";
import { PlannedFile } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";

export interface ProjectPlan {
  name: string;
  root: string;
  framework: "express";
  architecture: Architecture;
  packageManager: PackageManager;
  capabilities: ProjectCapabilities;
  zones: ApiZone[];
  dependencies: ResolvedDependencies;
}

export interface ProjectConfigBundle {
  project: SoapProjectConfig;
  structure: SoapStructureConfig;
  api: SoapApiConfig;
  registry: SoapRegistryConfig;
}

export function createDefaultCapabilities(): ProjectCapabilities {
  return {
    databases: [],
    auth: [],
    messaging: ["in-memory"],
    realtime: [],
    telemetry: ["logs"],
    apiClient: [],
    docs: [],
    contracts: [],
  };
}

export function createSoapConfigBundle(plan: ProjectPlan): ProjectConfigBundle {
  const defaultAuth = plan.capabilities.auth[0] ?? "none";
  const brunoEnabled = plan.capabilities.apiClient.includes("bruno");

  return {
    project: {
      schemaVersion: 1,
      name: plan.name,
      framework: plan.framework,
      architecture: plan.architecture,
      language: "typescript",
      packageManager: plan.packageManager,
      capabilities: plan.capabilities,
      zones: plan.zones,
    },
    structure: {
      featuresRoot: "src/features",
      commonRoot: "src/common",
      configRoot: "src/config",
      paths: {
        domain: "domain",
        application: "application",
        ports: "application/ports",
        useCases: "application/use-cases",
        commands: "application/commands",
        queries: "application/queries",
        data: "data",
        api: "api",
        contracts: "contracts",
        sockets: "api/sockets",
      },
    },
    api: {
      baseUrl: "http://localhost:3000",
      health: {
        method: "GET",
        path: "/health",
      },
      auth: {
        default: defaultAuth,
        loginRoute:
          defaultAuth === "none"
            ? undefined
            : {
                method: "POST",
                path: "/auth/login",
                tokenVariable: "accessToken",
              },
      },
      bruno: {
        enabled: brunoEnabled,
        collectionPath: "bruno",
        environment: "Local",
      },
    },
    registry: {
      resources: [],
      routes: [],
      generatedFiles: [],
    },
  };
}

export function parseCsvOption<T extends string>(value: string | string[] | undefined, allowed: readonly T[]): T[] {
  if (!value) {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const result = rawValues.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean);
  const normalized = result.filter((item) => item !== "none");
  const invalid = normalized.find((item) => !allowed.includes(item as T));

  if (invalid) {
    throw new Error(`Unsupported option value "${invalid}". Allowed values: none, ${allowed.join(", ")}.`);
  }

  return Array.from(new Set(normalized)) as T[];
}

export const databaseOptions: DatabaseCapability[] = ["mongo", "postgres", "mysql", "sqlite", "redis"];
const sqlDatabaseOptions: Array<Extract<DatabaseCapability, "postgres" | "mysql" | "sqlite">> = ["postgres", "mysql", "sqlite"];
export const authOptions: AuthCapability[] = ["jwt", "api-key", "local"];
export const messagingOptions: MessagingCapability[] = ["in-memory", "kafka"];
export const realtimeOptions: RealtimeCapability[] = ["ws"];
export const telemetryOptions: TelemetryCapability[] = ["logs", "otel-noop", "metrics", "memory"];
export const docsOptions: DocsCapability[] = ["openapi"];
export const contractsOptions: ContractsCapability[] = ["zod"];
export const zonesOptions: ApiZone[] = ["public", "private", "admin"];

function enabledSqlDatabases(capabilities: ProjectCapabilities): Array<Extract<DatabaseCapability, "postgres" | "mysql" | "sqlite">> {
  return sqlDatabaseOptions.filter((database) => capabilities.databases.includes(database));
}

export function targetRoot(cwd: string, name: string): string {
  return path.resolve(cwd, name);
}

export function createProjectFiles(plan: ProjectPlan): PlannedFile[] {
  const packageJson = {
    name: plan.name,
    version: "0.1.0",
    private: true,
    engines: {
      node: ">=24.17.0",
    },
    scripts: {
      dev: "tsx src/index.ts",
      "dev:watch": "tsx watch src/index.ts",
      build: "tsc -p tsconfig.json",
      start: "node build/index.js",
      test: "npm run build && find build -name '*.spec.js' -o -name '*.test.js' | xargs node --test",
      lint: "tsc -p tsconfig.json --noEmit",
      bruno: plan.capabilities.apiClient.includes("bruno") ? "cd bruno && bru run --env Local" : "echo \"Bruno is not enabled\"",
      "test:api": plan.capabilities.apiClient.includes("bruno") ? "npm run bruno" : "echo \"Bruno is not enabled\"",
    },
    dependencies: plan.dependencies.dependencies,
    devDependencies: plan.dependencies.devDependencies,
    ...(plan.capabilities.apiClient.includes("bruno")
      ? {
          overrides: {
            axios: "^1.16.0",
            "form-data": "^4.0.6",
            uuid: "^11.1.1",
          },
        }
      : {}),
  };

  const dockerServices = createDockerCompose(plan);

  return [
    {
      path: "package.json",
      type: "project",
      content: JSON.stringify(packageJson, null, 2),
    },
    {
      path: "tsconfig.json",
      type: "project",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "commonjs",
            moduleResolution: "node",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            experimentalDecorators: true,
            emitDecoratorMetadata: true,
            outDir: "build",
            rootDir: "src",
          },
          include: ["src/**/*"],
          exclude: ["node_modules", "build"],
        },
        null,
        2
      ),
    },
    {
      path: ".gitignore",
      type: "project",
      content: ["node_modules", "build", ".env", "*.log", ".DS_Store"].join("\n"),
    },
    {
      path: ".nvmrc",
      type: "project",
      content: "24.17.0\n",
    },
    {
      path: ".dockerignore",
      type: "docker",
      content: ["node_modules", "build", ".git", ".env", "bruno"].join("\n"),
    },
    {
      path: ".env.example",
      type: "config",
      content: createEnvExample(plan),
    },
    {
      path: "README.md",
      type: "project",
      content: createReadme(plan),
    },
    {
      path: "Dockerfile",
      type: "docker",
      content: createDockerfile(),
    },
    {
      path: "docker-compose.yml",
      type: "docker",
      content: dockerServices,
    },
    {
      path: "Makefile",
      type: "project",
      content: createMakefile(),
    },
    {
      path: "src/index.ts",
      type: "project",
      content: createIndexTs(plan),
    },
    {
      path: "src/config/config.ts",
      type: "config",
      content: createConfigTs(plan),
    },
    {
      path: "src/config/dependencies.ts",
      type: "config",
      content: createDependenciesTs(plan),
    },
    {
      path: "src/config/resources.ts",
      type: "config",
      content: createResourcesTs([]),
    },
    {
      path: "src/config/controllers.ts",
      type: "config",
      content: createControllersTs(createInitialControllers(plan)),
    },
    {
      path: "src/features/index.ts",
      type: "config",
      content: createFeaturesIndexTs(plan),
    },
    ...createCqrsFiles(plan),
    ...createMongoFiles(plan),
    ...createSqlFiles(plan),
    ...createEventFiles(plan),
    ...createSocketFiles(plan),
    ...createAuthFiles(plan),
    {
      path: "src/features/health/.gitkeep",
      type: "project",
      content: "",
    },
    ...createBrunoFiles(plan),
  ];
}

function createIndexTs(plan: ProjectPlan): string {
  const docsImports = plan.capabilities.docs.includes("openapi")
    ? "import { DocumentationPlugin } from '@soapjs/soap-openapi';\n"
    : "";
  const expressImport = plan.capabilities.telemetry.includes("memory")
    ? "import { createApp, MemoryMonitoringPlugin } from '@soapjs/soap-express';"
    : "import { createApp } from '@soapjs/soap-express';";
  const authImport = plan.capabilities.auth.length > 0
    ? "import { createAuthRouter } from '@soapjs/soap-express/auth';\n"
    : "";
  const socketImport = plan.capabilities.realtime.includes("ws")
    ? "import { createSocketRuntime } from './common/sockets/socket.setup';\n"
    : "";
  const cqrsImport = plan.architecture === "cqrs" ? "import './config/cqrs';\n" : "";
  const docsPlugin = plan.capabilities.docs.includes("openapi")
    ? `\n    plugins: [\n      {\n        plugin: new DocumentationPlugin(),\n        options: {\n          info: {\n            title: '${plan.name} API',\n            version: '0.1.0',\n          },\n          servers: [{ url: \`http://localhost:\${config.port}\`, description: 'Local' }],\n          interactivePath: '/docs',\n          openApiPath: '/openapi.json',\n        },\n      },\n    ],`
    : "";
  const cqrsOption = plan.architecture === "cqrs" ? "\n    cqrs: true," : "";
  const authRegistration = plan.capabilities.auth.length > 0
    ? `\n  app.registerAuth(auth);\n  app.getApp().use(createAuthRouter(auth, {\n    basePath: '/auth',\n    strategy: '${defaultAuthStrategy(plan)}',\n    routes: {\n      login: { path: '/auth/login', strategy: '${loginAuthStrategy(plan)}' },\n      logout: { path: '/auth/logout', strategy: '${loginAuthStrategy(plan)}' },\n      refresh: { path: '/auth/refresh', strategy: 'jwt', enabled: ${usesJwtAuth(plan)} },\n      me: { path: '/auth/me', strategy: '${defaultAuthStrategy(plan)}' },\n      verify: { path: '/auth/verify', strategy: '${defaultAuthStrategy(plan)}' },\n    },\n  }));\n`
    : "";
  const metrics = plan.capabilities.telemetry.includes("metrics")
    ? `\n  app.useMetrics({\n    enabled: true,\n    exposeEndpoint: true,\n    metricsPath: '/metrics',\n    metricsFormat: 'prometheus',\n  });\n`
    : "";
  const memory = plan.capabilities.telemetry.includes("memory")
    ? `\n  const memoryMonitoringOptions = {\n    enabled: true,\n    exposeEndpoints: true,\n    basePath: '/memory',\n    includeInRequest: false,\n  };\n  let memoryMonitoringPlugin: MemoryMonitoringPlugin | undefined;\n\n  try {\n    app.useMemoryMonitoring(memoryMonitoringOptions);\n  } catch (error) {\n    memoryMonitoringPlugin = new MemoryMonitoringPlugin(memoryMonitoringOptions, logger);\n    (memoryMonitoringPlugin as { version?: string }).version ??= '0.1.0';\n    app.usePlugin(memoryMonitoringPlugin, memoryMonitoringOptions);\n  }\n\n  const getMemorySummary = () => app.getMemorySummary() ?? memoryMonitoringPlugin?.getMemorySummary();\n  app.getApp().get('/memory', (_req, res) => res.json(getMemorySummary()));\n  app.getApp().get('/memory/summary', (_req, res) => res.json(getMemorySummary()));\n  app.getApp().get('/memory/health', (_req, res) => {\n    const summary = getMemorySummary();\n    res.status(summary?.status === 'critical' ? 503 : 200).json({ status: summary?.status ?? 'unknown', summary });\n  });\n`
    : "";
  const socketRuntime = plan.capabilities.realtime.includes("ws")
    ? `\n  const socketRuntime = createSocketRuntime(config, app.getServer());\n  app.registerDrainable(socketRuntime);\n`
    : "";

  return `import 'reflect-metadata';
${expressImport}
${docsImports}${authImport}${socketImport}${cqrsImport}import './features';
import { config } from './config/config';
import { controllers } from './config/controllers';
import { buildContainer } from './config/dependencies';

async function main(): Promise<void> {
  const { container, drainables, logger, auth } = await buildContainer(config);

  const app = createApp({
    container,
    logger,
    drainables,
    controllers,
    middleware: {
      logging: true,
      compression: true,
    },
    app: {
      security: ${createSecurityConfig(plan)},
    },
    healthCheck: true,${cqrsOption}${docsPlugin}
  });
${authRegistration}${metrics}${memory}

  const cqrsReady = (app as unknown as { cqrsReady?: Promise<void> }).cqrsReady;
  if (cqrsReady) {
    await cqrsReady;
  }

  await app.start(config.port);
${socketRuntime}

  logger.info('${plan.name} API ready', { port: config.port });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;
}

function defaultAuthStrategy(plan: ProjectPlan): string {
  if (plan.capabilities.auth.includes("jwt")) return "jwt";
  if (plan.capabilities.auth.includes("local")) return "local";
  if (plan.capabilities.auth.includes("api-key")) return "api-key";
  return "jwt";
}

function loginAuthStrategy(plan: ProjectPlan): string {
  if (plan.capabilities.auth.includes("local") || plan.capabilities.auth.includes("jwt")) return "local";
  if (plan.capabilities.auth.includes("api-key")) return "api-key";
  return defaultAuthStrategy(plan);
}

function createSecurityConfig(plan: ProjectPlan): string {
  const throttle = plan.capabilities.auth.length > 0
    ? `{
        global: { windowMs: 60_000, max: 300 },
        routes: {
          'POST /auth/login': { windowMs: 60_000, max: 5 },
          'POST /auth/refresh': { windowMs: 60_000, max: 20, keyBy: 'user' },
          'GET /auth/oauth/:provider/callback': { windowMs: 60_000, max: 30 },
        },
      }`
    : "{ global: { windowMs: 60_000, max: 300 } }";

  return `{
      disablePoweredBy: true,
      trustProxy: 1,
      helmet: true,
      cors: true,
      throttle: ${throttle},
    }`;
}

function createConfigTs(plan: ProjectPlan): string {
  const mongo = plan.capabilities.databases.includes("mongo")
    ? "\n  mongoUri: readEnv('MONGO_URI', 'mongodb://localhost:27017/app'),"
    : "";
  const postgres = plan.capabilities.databases.includes("postgres")
    ? "\n  postgres: {\n    host: readEnv('POSTGRES_HOST', 'localhost'),\n    port: Number(readEnv('POSTGRES_PORT', '5432')),\n    database: readEnv('POSTGRES_DB', 'app'),\n    user: readEnv('POSTGRES_USER', 'app'),\n    password: readEnv('POSTGRES_PASSWORD', 'app'),\n  },"
    : "";
  const mysql = plan.capabilities.databases.includes("mysql")
    ? "\n  mysql: {\n    host: readEnv('MYSQL_HOST', 'localhost'),\n    port: Number(readEnv('MYSQL_PORT', '3306')),\n    database: readEnv('MYSQL_DATABASE', 'app'),\n    user: readEnv('MYSQL_USER', 'app'),\n    password: readEnv('MYSQL_PASSWORD', 'app'),\n  },"
    : "";
  const sqlite = plan.capabilities.databases.includes("sqlite")
    ? "\n  sqlite: {\n    filename: readEnv('SQLITE_FILENAME', './data/app.sqlite'),\n  },"
    : "";
  const redis = plan.capabilities.databases.includes("redis")
    ? "\n  redisUrl: readEnv('REDIS_URL', 'redis://localhost:6379'),"
    : "";
  const kafka = plan.capabilities.messaging.includes("kafka")
    ? "\n  kafkaBrokers: readEnv('KAFKA_BROKERS', 'localhost:9092').split(','),\n  eventBus: readEnv('EVENT_BUS', 'in-memory'),"
    : "\n  eventBus: 'in-memory',";
  const sockets = plan.capabilities.realtime.includes("ws")
    ? "\n  wsPath: readEnv('WS_PATH', '/ws'),\n  wsHeartbeatMs: Number(readEnv('WS_HEARTBEAT_MS', '30000')),"
    : "";
  const jwt = plan.capabilities.auth.length > 0
    ? "\n  jwtAccessSecret: readEnv('JWT_ACCESS_SECRET', 'dev-access-secret'),\n  jwtRefreshSecret: readEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret'),"
    : "";
  const apiKey = plan.capabilities.auth.length > 0
    ? "\n  apiKeyHeader: readEnv('API_KEY_HEADER', 'x-api-key'),\n  devApiKey: readEnv('DEV_API_KEY', 'dev-api-key'),"
    : "";

  return `import 'dotenv/config';

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;

  if (value === undefined || value === '') {
    throw new Error(\`Missing required environment variable: \${name}\`);
  }

  return value;
}

export const config = {
  nodeEnv: readEnv('NODE_ENV', 'development'),
  port: Number(readEnv('PORT', '3000')),
  logLevel: readEnv('LOG_LEVEL', 'debug'),${mongo}${postgres}${mysql}${sqlite}${redis}${kafka}${sockets}${jwt}${apiKey}
};

export type AppConfig = typeof config;
`;
}

function createDependenciesTs(plan: ProjectPlan): string {
  const authImport = plan.capabilities.auth.length > 0
    ? "import { SoapAuth } from '@soapjs/soap-auth';\nimport { createAuthProvider } from '../features/auth/auth.setup';\n"
    : "";
  const mongoImport = plan.capabilities.databases.includes("mongo")
    ? "import { SoapMongo } from '@soapjs/soap-mongo';\nimport { createMongoClient } from '../common/data/mongo/mongo.client';\n"
    : "";
  const sqlDatabases = enabledSqlDatabases(plan.capabilities);
  const sqlImport = sqlDatabases.length > 0
    ? `import { SoapSQL } from '@soapjs/soap-sql';
${sqlDatabases.map((database) => `import { create${createNameVariants(database).pascalName}Client } from '../common/data/${database}/${database}.client';`).join("\n")}
`
    : "";
  const eventImport = plan.capabilities.messaging.length > 0
    ? "import { DomainEventBus } from '@soapjs/soap/cqrs';\nimport { createEventBus } from '../common/events/event-bus.setup';\n"
    : "";
  const authProvider = plan.capabilities.auth.length > 0 ? "await createAuthProvider(_config, logger)" : "undefined";
  const resourceContextType = [
    plan.capabilities.databases.includes("mongo") ? "  mongo?: SoapMongo;" : undefined,
    sqlDatabases.length > 0 ? "  sql?: Partial<Record<'postgres' | 'mysql' | 'sqlite', SoapSQL>>;" : undefined,
  ].filter(Boolean).join("\n");
  const mongoSetup = plan.capabilities.databases.includes("mongo")
    ? `\n  const mongo = await createMongoClient(_config);\n  drainables.push(mongo);\n  resources.mongo = mongo;\n`
    : "";
  const sqlSetup = sqlDatabases.length > 0
    ? `\n  resources.sql = {};
${sqlDatabases.map((database) => {
  const names = createNameVariants(database);
  return `  const ${names.camelName} = await create${names.pascalName}Client(_config);
  drainables.push(${names.camelName});
  resources.sql.${database} = ${names.camelName};`;
}).join("\n")}\n`
    : "";
  const eventSetup = plan.capabilities.messaging.length > 0
    ? `\n  const eventBusRuntime = await createEventBus(_config, logger);\n  container.bindValue(DomainEventBus.Token, eventBusRuntime.bus);\n  if (eventBusRuntime.drainable) {\n    drainables.push(eventBusRuntime.drainable);\n  }\n`
    : "";
  const authReturnType = plan.capabilities.auth.length > 0 ? "  auth: SoapAuth;" : "  auth?: undefined;";

  return `import { ConsoleLogger, DIContainer } from '@soapjs/soap-express';
import { Drainable } from '@soapjs/soap/events';
import { AppConfig } from './config';
import { registerResources } from './resources';
${mongoImport}${sqlImport}${eventImport}${authImport}

export interface ResourceContext {
${resourceContextType}
}

export async function buildContainer(_config: AppConfig): Promise<{
  container: DIContainer;
  drainables: Drainable[];
  logger: ConsoleLogger;
${authReturnType}
}> {
  const container = new DIContainer();
  const logger = new ConsoleLogger();
  const drainables: Drainable[] = [];
  const resources: ResourceContext = {};
  const auth = ${authProvider};
${mongoSetup}${sqlSetup}${eventSetup}

  await registerResources(container, resources);

  return {
    container,
    drainables,
    logger,
    auth,
  };
}
`;
}

export interface ResourceRegistration {
  functionName: string;
  importPath: string;
}

export function createResourcesTs(resources: ResourceRegistration[]): string {
  if (resources.length === 0) {
    return `import { DIContainer } from '@soapjs/soap-express';
import { ResourceContext } from './dependencies';

export async function registerResources(_container: DIContainer, _resources: ResourceContext): Promise<void> {}
`;
  }

  const imports = resources
    .map((resource) => `import { ${resource.functionName} } from '${resource.importPath}';`)
    .join("\n");
  return `import { DIContainer } from '@soapjs/soap-express';
import { ResourceContext } from './dependencies';
${imports}

export async function registerResources(container: DIContainer, resources: ResourceContext): Promise<void> {
${resources.map((resource) => `  await ${resource.functionName}(container, resources);`).join("\n")}
}
`;
}

function createMongoFiles(plan: ProjectPlan): PlannedFile[] {
  if (!plan.capabilities.databases.includes("mongo")) {
    return [];
  }

  return [
    {
      path: "src/config/mongo.config.ts",
      type: "config",
      content: `import { MongoConfig } from '@soapjs/soap-mongo';
import { AppConfig } from './config';

export function createMongoConfig(config: Pick<AppConfig, 'mongoUri'>): MongoConfig {
  const uri = new URL(config.mongoUri);
  const database = uri.pathname.replace(/^\\//, '') || 'app';
  const hosts = uri.hostname.split(',').filter(Boolean);
  const ports = uri.port ? [Number(uri.port)] : undefined;
  const user = uri.username ? decodeURIComponent(uri.username) : undefined;
  const password = uri.password ? decodeURIComponent(uri.password) : undefined;
  const authSource = uri.searchParams.get('authSource') ?? undefined;
  const replicaSet = uri.searchParams.get('replicaSet') ?? undefined;
  const srv = uri.protocol === 'mongodb+srv:';

  return new MongoConfig(database, hosts, ports, user, password, undefined, authSource, undefined, replicaSet, srv);
}
`,
    },
    {
      path: "src/common/data/mongo/mongo.client.ts",
      type: "config",
      content: `import { SoapMongo } from '@soapjs/soap-mongo';
import { AppConfig } from '../../../config/config';
import { createMongoConfig } from '../../../config/mongo.config';

export async function createMongoClient(config: AppConfig): Promise<SoapMongo> {
  return SoapMongo.create(createMongoConfig(config));
}
`,
    },
    {
      path: "src/common/data/mongo/mongo.source-factory.ts",
      type: "config",
      content: `import { MongoSource, SoapMongo } from '@soapjs/soap-mongo';
import { Document } from 'mongodb';

export function createMongoSource<T extends Document = Document>(mongo: SoapMongo, collectionName: string): MongoSource<T> {
  return new MongoSource<T>(mongo, collectionName);
}
`,
    },
  ];
}

function createSqlFiles(plan: ProjectPlan): PlannedFile[] {
  const databases = enabledSqlDatabases(plan.capabilities);

  if (databases.length === 0) {
    return [];
  }

  return [
    ...databases.flatMap((database) => createSqlDatabaseFiles(database)),
    {
      path: "src/common/data/sql/sql.source-factory.ts",
      type: "config",
      content: `import { SoapSQL, SqlDataSource } from '@soapjs/soap-sql';

export function createSqlSource<T = Record<string, unknown>>(sql: SoapSQL, tableName: string): SqlDataSource<T> {
  return new SqlDataSource<T>(sql, tableName);
}
`,
    },
    {
      path: "src/common/data/sql/migrations/.gitkeep",
      type: "config",
      content: "",
    },
  ];
}

function createSqlDatabaseFiles(database: Extract<DatabaseCapability, "postgres" | "mysql" | "sqlite">): PlannedFile[] {
  const names = createNameVariants(database);
  const configProperty = names.camelName;

  return [
    {
      path: `src/config/${database}.config.ts`,
      type: "config",
      content: `import { SqlDatabaseConfig } from '@soapjs/soap-sql';
import { AppConfig } from './config';

export function create${names.pascalName}Config(config: Pick<AppConfig, '${configProperty}'>): SqlDatabaseConfig {
  return new SqlDatabaseConfig({
${createSqlConfigProperties(database, configProperty)}
    connectionLimit: 10,
  });
}
`,
    },
    {
      path: `src/common/data/${database}/${database}.client.ts`,
      type: "config",
      content: `import { SoapSQL } from '@soapjs/soap-sql';
import { AppConfig } from '../../../config/config';
import { create${names.pascalName}Config } from '../../../config/${database}.config';

export async function create${names.pascalName}Client(config: AppConfig): Promise<SoapSQL> {
  return SoapSQL.create(create${names.pascalName}Config(config));
}
`,
    },
  ];
}

function createSqlConfigProperties(
  database: Extract<DatabaseCapability, "postgres" | "mysql" | "sqlite">,
  configProperty: string
): string {
  if (database === "sqlite") {
    return `    type: 'sqlite',
    host: 'localhost',
    port: 0,
    database: config.${configProperty}.filename,
    username: '',
    password: '',
    filename: config.${configProperty}.filename,`;
  }

  const sqlType = database === "postgres" ? "postgresql" : "mysql";

  return `    type: '${sqlType}',
    host: config.${configProperty}.host,
    port: config.${configProperty}.port,
    database: config.${configProperty}.database,
    username: config.${configProperty}.user,
    password: config.${configProperty}.password,`;
}

function createCqrsFiles(plan: ProjectPlan): PlannedFile[] {
  if (plan.architecture !== "cqrs") {
    return [];
  }

  return [
    {
      path: "src/config/cqrs.ts",
      type: "config",
      content: `// Generated CQRS handler imports. Updated by soap add command/query.
export {};
`,
    },
  ];
}

function createEventFiles(plan: ProjectPlan): PlannedFile[] {
  if (plan.capabilities.messaging.length === 0) {
    return [];
  }

  const files: PlannedFile[] = [
    {
      path: "src/common/events/domain-event.ts",
      type: "config",
      content: `export { BaseDomainEvent, DomainEvent } from '@soapjs/soap/domain';
export { DomainEventBus, DomainEventConsumer, InMemoryDomainEventBus } from '@soapjs/soap/cqrs';
`,
    },
    {
      path: "src/common/events/event-bus.setup.ts",
      type: "config",
      content: plan.capabilities.messaging.includes("kafka")
        ? `import { DomainEventBus, InMemoryDomainEventBus } from '@soapjs/soap/cqrs';
import { Drainable } from '@soapjs/soap/events';
import { Logger } from '@soapjs/soap/common';
import { AppConfig } from '../../config/config';
import { createKafkaDomainEventBus } from './kafka/kafka-event-bus';

export interface EventBusRuntime {
  bus: DomainEventBus;
  drainable?: Drainable;
}

export async function createEventBus(config: AppConfig, logger: Logger): Promise<EventBusRuntime> {
  if (config.eventBus === 'kafka') {
    const bus = createKafkaDomainEventBus(config, logger);
    await bus.start();

    return {
      bus,
      drainable: {
        close: () => bus.stop(),
      },
    };
  }

  return { bus: new InMemoryDomainEventBus() };
}
`
        : `import { DomainEventBus, InMemoryDomainEventBus } from '@soapjs/soap/cqrs';
import { Drainable } from '@soapjs/soap/events';
import { Logger } from '@soapjs/soap/common';
import { AppConfig } from '../../config/config';

export interface EventBusRuntime {
  bus: DomainEventBus;
  drainable?: Drainable;
}

export async function createEventBus(_config: AppConfig, _logger: Logger): Promise<EventBusRuntime> {
  return { bus: new InMemoryDomainEventBus() };
}
`,
    },
  ];

  if (plan.capabilities.messaging.includes("kafka")) {
    files.push(
      {
        path: "src/config/kafka.config.ts",
        type: "config",
        content: `import { AppConfig } from './config';

export function createKafkaConfig(config: Pick<AppConfig, 'kafkaBrokers'>) {
  return {
    brokers: config.kafkaBrokers,
    clientId: 'soapjs-service',
    topicName: 'domain-events',
    groupId: 'soapjs-service',
    ensureTopic: true,
  };
}
`,
      },
      {
        path: "src/common/events/kafka/kafka.client.ts",
        type: "config",
        content: `import { KafkaEventBus } from '@soapjs/soap-kafka';
import { AppConfig } from '../../../config/config';
import { createKafkaConfig } from '../../../config/kafka.config';

export function createKafkaClient(config: AppConfig): KafkaEventBus<Record<string, unknown>, Record<string, unknown>> {
  return new KafkaEventBus<Record<string, unknown>, Record<string, unknown>>(createKafkaConfig(config));
}
`,
      },
      {
        path: "src/common/events/kafka/kafka-event-bus.ts",
        type: "config",
        content: `import { KafkaDomainEventBus } from '@soapjs/soap-kafka';
import { Logger } from '@soapjs/soap/common';
import { AppConfig } from '../../../config/config';
import { createKafkaClient } from './kafka.client';

export function createKafkaDomainEventBus(config: AppConfig, logger: Logger): KafkaDomainEventBus {
  return new KafkaDomainEventBus(createKafkaClient(config), {
    topic: 'domain-events',
    groupId: 'soapjs-service',
    logger,
  });
}
`,
      }
    );
  }

  return files;
}

function createSocketFiles(plan: ProjectPlan): PlannedFile[] {
  if (!plan.capabilities.realtime.includes("ws")) {
    return [];
  }

  return [
    {
      path: "src/config/sockets.ts",
      type: "config",
      content: `import { AppSocketHandler } from '../common/sockets/socket.setup';

export const socketHandlers: AppSocketHandler[] = [];
`,
    },
    {
      path: "src/common/sockets/socket.setup.ts",
      type: "config",
      content: `import { Server } from 'http';
import { Drainable } from '@soapjs/soap/events';
import { SocketMessage, SocketServer, WebSocketServerAdapter } from '@soapjs/soap-socket';
import { AppConfig } from '../../config/config';
import { socketHandlers } from '../../config/sockets';

export interface AppSocketHandler {
  event: string;
  handle(clientId: string, message: SocketMessage, server: SocketServer): Promise<void> | void;
}

export interface SocketRuntime extends Drainable {
  server: SocketServer;
}

export function createSocketRuntime(config: AppConfig, httpServer: Server): SocketRuntime {
  const adapter = new WebSocketServerAdapter({ server: httpServer, path: config.wsPath });
  const server = new SocketServer(adapter as any, {
    port: config.port,
    heartbeatInterval: config.wsHeartbeatMs,
    onConnection: (clientId) => {
      server.sendToClient(clientId, {
        type: 'connected',
        payload: { clientId },
      });
    },
    onMessage: async (clientId, message) => {
      const handler = socketHandlers.find((item) => item.event === message.type);
      if (handler) {
        await handler.handle(clientId, message, server);
      }
    },
  });

  return {
    server,
    close: async () => server.shutdown(),
  };
}
`,
    },
    {
      path: "src/common/sockets/ws.socket-server.ts",
      type: "config",
      content: `export { createSocketRuntime } from './socket.setup';
export type { AppSocketHandler, SocketRuntime } from './socket.setup';
`,
    },
  ];
}

export interface ControllerRegistration {
  className: string;
  importPath: string;
  spread?: boolean;
}

export function createControllersTs(controllers: ControllerRegistration[]): string {
  if (controllers.length === 0) {
    return `export const controllers = [];
`;
  }

  const imports = controllers
    .map((controller) => `import { ${controller.className} } from '${controller.importPath}';`)
    .join("\n");
  const names = controllers.map((controller) => `  ${controller.spread ? "..." : ""}${controller.className},`).join("\n");

  return `${imports}

export const controllers = [
${names}
];
`;
}

function createInitialControllers(plan: ProjectPlan): ControllerRegistration[] {
  void plan;
  return [];
}

function createEnvExample(plan: ProjectPlan): string {
  const lines = ["NODE_ENV=development", "PORT=3000", "LOG_LEVEL=debug"];

  if (plan.capabilities.databases.includes("mongo")) {
    lines.push("MONGO_URI=mongodb://localhost:27017/app");
  }

  if (plan.capabilities.databases.includes("postgres")) {
    lines.push("POSTGRES_HOST=localhost", "POSTGRES_PORT=5432", "POSTGRES_DB=app", "POSTGRES_USER=app", "POSTGRES_PASSWORD=app");
  }

  if (plan.capabilities.databases.includes("mysql")) {
    lines.push("MYSQL_HOST=localhost", "MYSQL_PORT=3306", "MYSQL_DATABASE=app", "MYSQL_USER=app", "MYSQL_PASSWORD=app");
  }

  if (plan.capabilities.databases.includes("sqlite")) {
    lines.push("SQLITE_FILENAME=./data/app.sqlite");
  }

  if (plan.capabilities.databases.includes("redis")) {
    lines.push("REDIS_URL=redis://localhost:6379");
  }

  if (plan.capabilities.auth.includes("jwt") || plan.capabilities.auth.includes("local")) {
    lines.push("JWT_ACCESS_SECRET=change-me-access", "JWT_REFRESH_SECRET=change-me-refresh");
  }

  if (plan.capabilities.auth.includes("api-key")) {
    lines.push("API_KEY_HEADER=x-api-key", "DEV_API_KEY=dev-api-key");
  }

  if (plan.capabilities.messaging.includes("kafka")) {
    lines.push("KAFKA_BROKERS=localhost:9092", "EVENT_BUS=in-memory");
  }

  if (plan.capabilities.realtime.includes("ws")) {
    lines.push("WS_PATH=/ws", "WS_HEARTBEAT_MS=30000");
  }

  return `${lines.join("\n")}\n`;
}

function createReadme(plan: ProjectPlan): string {
  const runCommand = plan.packageManager === "npm" ? "npm run dev" : `${plan.packageManager} dev`;
  const buildCommand = plan.packageManager === "npm" ? "npm run build" : `${plan.packageManager} build`;
  const installCommand = `${plan.packageManager} install`;
  const dockerSection = `## Docker Development

\`\`\`bash
make up
make logs
curl http://localhost:3000/health
make down
\`\`\`

`;
  const brunoSection = plan.capabilities.apiClient.includes("bruno")
    ? `## Bruno API Tests

\`\`\`bash
${plan.packageManager === "npm" ? "npm run bruno" : `${plan.packageManager} bruno`}
${plan.packageManager === "npm" ? "npm run test:api" : `${plan.packageManager} test:api`}
\`\`\`

The collection is generated in \`bruno/\` and uses the \`Local\` environment.

`
    : "";
  const openApiSection = plan.capabilities.docs.includes("openapi")
    ? `## OpenAPI

Start the API, then open:

- http://localhost:3000/docs
- http://localhost:3000/openapi.json

\`\`\`bash
curl http://localhost:3000/openapi.json
\`\`\`

`
    : "";
  const authSection = createReadmeAuthSection(plan);
  const monitoringSection = createReadmeMonitoringSection(plan);
  const addCommands = `## Add More Code

\`\`\`bash
soap add resource invoice --crud
soap add route invoices export --method get --path export
soap update config --add-contracts zod
soap update config --add-api-client bruno
\`\`\`
`;

  return `# ${plan.name}

Generated SoapJS service.

Requires Node.js 24.17.0 or newer. The generated runtime uses SoapJS 0.14, soap-auth 1.x, and the soap-express security/auth helpers.

## Capabilities

- Framework: ${plan.framework}
- Architecture: ${plan.architecture}
- Databases: ${plan.capabilities.databases.length ? plan.capabilities.databases.join(", ") : "none"}
- Auth: ${plan.capabilities.auth.length ? plan.capabilities.auth.join(", ") : "none"}
- Messaging: ${plan.capabilities.messaging.join(", ")}
- Telemetry: ${plan.capabilities.telemetry.join(", ")}
- Realtime: ${plan.capabilities.realtime.length ? plan.capabilities.realtime.join(", ") : "none"}
- API client: ${plan.capabilities.apiClient.length ? plan.capabilities.apiClient.join(", ") : "none"}
- Docs: ${plan.capabilities.docs.length ? plan.capabilities.docs.join(", ") : "none"}
- Contracts: ${plan.capabilities.contracts.length ? plan.capabilities.contracts.join(", ") : "none"}

## Local Development

\`\`\`bash
${installCommand}
${runCommand}
\`\`\`

Health check:

\`\`\`bash
curl http://localhost:3000/health
\`\`\`

Build:

\`\`\`bash
${buildCommand}
\`\`\`

${dockerSection}${brunoSection}${openApiSection}${authSection}${monitoringSection}## Folder Structure

\`\`\`txt
src/
  index.ts
  config/
    config.ts
    controllers.ts
    dependencies.ts
    resources.ts
  common/
  features/
    <resource>/
      domain/
      application/
      data/
      api/
      contracts/
\`\`\`

Generated metadata is stored in \`.soap/\`.

${addCommands}
`;
}

function createReadmeMonitoringSection(plan: ProjectPlan): string {
  const endpoints: string[] = [];

  if (plan.capabilities.telemetry.includes("metrics")) {
    endpoints.push("- Metrics: http://localhost:3000/metrics");
  }

  if (plan.capabilities.telemetry.includes("memory")) {
    endpoints.push("- Memory monitoring: http://localhost:3000/memory");
  }

  if (endpoints.length === 0) {
    return "";
  }

  return `## Monitoring

Monitoring endpoints are opt-in and were generated because telemetry includes \`${plan.capabilities.telemetry.filter((item) => item === "metrics" || item === "memory").join(", ")}\`.

${endpoints.join("\n")}

`;
}

function createReadmeAuthSection(plan: ProjectPlan): string {
  const sections: string[] = [];

  if (plan.capabilities.auth.includes("jwt") || plan.capabilities.auth.includes("local")) {
    sections.push(`### JWT/local auth dev credentials

Default Bruno login variables:

- email: \`admin@example.com\`
- password: \`admin123\`

Auth is registered through \`SoapAuth.create(...)\` and \`createAuthRouter(...)\`. Set \`JWT_ACCESS_SECRET\` and \`JWT_REFRESH_SECRET\` in \`.env.example\` or your local \`.env\`.

`);
  }

  if (plan.capabilities.auth.includes("api-key")) {
    sections.push(`### API key auth dev credentials

Default header and key:

- \`API_KEY_HEADER=x-api-key\`
- \`DEV_API_KEY=dev-api-key\`

API key auth uses \`createApiKeyAuthConfig(...)\` with a development \`retrieveUserByApiKey\` implementation.

`);
  }

  const security = sections.length > 0
    ? `Route-specific throttling is enabled for \`POST /auth/login\`, \`POST /auth/refresh\`, and OAuth callbacks through soap-express security config.\n\n`
    : "";

  return sections.length > 0 ? `## Auth\n\n${security}${sections.join("\n")}` : "";
}

function createDockerfile(): string {
  return `FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
`;
}

function createDockerCompose(plan: ProjectPlan): string {
  const apiEnvironment = createDockerApiEnvironment(plan);
  const apiDependsOn = createDockerApiDependsOn(plan);
  const services = [
    "services:",
    "  api:",
    "    build: .",
    "    ports:",
    "      - \"3000:3000\"",
    "    env_file:",
    "      - .env.example",
    ...apiEnvironment,
    ...apiDependsOn,
  ];

  if (plan.capabilities.databases.includes("mongo")) {
    services.push(
      "  mongo:",
      "    image: mongo:7",
      "    ports:",
      "      - \"27017:27017\"",
      "    volumes:",
      "      - mongo-data:/data/db",
      "    healthcheck:",
      "      test: [\"CMD\", \"mongosh\", \"--quiet\", \"--eval\", \"db.adminCommand('ping')\"]",
      "      interval: 5s",
      "      timeout: 5s",
      "      retries: 10"
    );
  }

  if (plan.capabilities.databases.includes("postgres")) {
    services.push(
      "  postgres:",
      "    image: postgres:16",
      "    environment:",
      "      POSTGRES_DB: app",
      "      POSTGRES_USER: app",
      "      POSTGRES_PASSWORD: app",
      "    ports:",
      "      - \"5432:5432\"",
      "    volumes:",
      "      - postgres-data:/var/lib/postgresql/data",
      "    healthcheck:",
      "      test: [\"CMD-SHELL\", \"pg_isready -U app -d app\"]",
      "      interval: 5s",
      "      timeout: 5s",
      "      retries: 10"
    );
  }

  if (plan.capabilities.databases.includes("mysql")) {
    services.push(
      "  mysql:",
      "    image: mysql:8",
      "    environment:",
      "      MYSQL_DATABASE: app",
      "      MYSQL_USER: app",
      "      MYSQL_PASSWORD: app",
      "      MYSQL_ROOT_PASSWORD: app",
      "    ports:",
      "      - \"3306:3306\"",
      "    volumes:",
      "      - mysql-data:/var/lib/mysql",
      "    healthcheck:",
      "      test: [\"CMD\", \"mysqladmin\", \"ping\", \"-h\", \"localhost\", \"-uapp\", \"-papp\"]",
      "      interval: 5s",
      "      timeout: 5s",
      "      retries: 10"
    );
  }

  if (plan.capabilities.databases.includes("redis")) {
    services.push(
      "  redis:",
      "    image: redis:7",
      "    ports:",
      "      - \"6379:6379\"",
      "    healthcheck:",
      "      test: [\"CMD\", \"redis-cli\", \"ping\"]",
      "      interval: 5s",
      "      timeout: 5s",
      "      retries: 10"
    );
  }

  if (plan.capabilities.messaging.includes("kafka")) {
    services.push(
      "  redpanda:",
      "    image: redpandadata/redpanda:v24.1.1",
      "    command:",
      "      - redpanda",
      "      - start",
      "      - --overprovisioned",
      "      - --smp",
      "      - \"1\"",
      "      - --memory",
      "      - 512M",
      "      - --reserve-memory",
      "      - 0M",
      "      - --node-id",
      "      - \"0\"",
      "      - --check=false",
      "      - --kafka-addr",
      "      - internal://0.0.0.0:9092,external://0.0.0.0:19092",
      "      - --advertise-kafka-addr",
      "      - internal://redpanda:9092,external://localhost:9092",
      "    ports:",
      "      - \"9092:19092\"",
      "    healthcheck:",
      "      test: [\"CMD\", \"rpk\", \"cluster\", \"info\", \"--brokers\", \"redpanda:9092\"]",
      "      interval: 5s",
      "      timeout: 5s",
      "      retries: 10"
    );
  }

  const volumes = ["volumes:"];
  if (plan.capabilities.databases.includes("mongo")) volumes.push("  mongo-data:");
  if (plan.capabilities.databases.includes("postgres")) volumes.push("  postgres-data:");
  if (plan.capabilities.databases.includes("mysql")) volumes.push("  mysql-data:");

  return `${services.join("\n")}\n${volumes.length > 1 ? volumes.join("\n") : ""}\n`;
}

function createDockerApiEnvironment(plan: ProjectPlan): string[] {
  const environment = ["    environment:"];

  if (plan.capabilities.databases.includes("mongo")) {
    environment.push("      MONGO_URI: mongodb://mongo:27017/app");
  }

  if (plan.capabilities.databases.includes("postgres")) {
    environment.push("      POSTGRES_HOST: postgres");
  }

  if (plan.capabilities.databases.includes("mysql")) {
    environment.push("      MYSQL_HOST: mysql");
  }

  if (plan.capabilities.databases.includes("redis")) {
    environment.push("      REDIS_URL: redis://redis:6379");
  }

  if (plan.capabilities.messaging.includes("kafka")) {
    environment.push("      EVENT_BUS: kafka", "      KAFKA_BROKERS: redpanda:9092");
  }

  return environment.length > 1 ? environment : [];
}

function createDockerApiDependsOn(plan: ProjectPlan): string[] {
  const dependencies = ["    depends_on:"];

  if (plan.capabilities.databases.includes("mongo")) {
    dependencies.push("      mongo:", "        condition: service_healthy");
  }

  if (plan.capabilities.databases.includes("postgres")) {
    dependencies.push("      postgres:", "        condition: service_healthy");
  }

  if (plan.capabilities.databases.includes("mysql")) {
    dependencies.push("      mysql:", "        condition: service_healthy");
  }

  if (plan.capabilities.databases.includes("redis")) {
    dependencies.push("      redis:", "        condition: service_healthy");
  }

  if (plan.capabilities.messaging.includes("kafka")) {
    dependencies.push("      redpanda:", "        condition: service_healthy");
  }

  return dependencies.length > 1 ? dependencies : [];
}

function createMakefile(): string {
  return `.PHONY: help up down down-clean logs build dev test lint bruno test-api openapi kafka-mode

help:
\t@grep -E '^[a-zA-Z_-]+:' Makefile

up:
\tdocker compose up -d --build

down:
\tdocker compose down

down-clean:
\tdocker compose down -v

logs:
\tdocker compose logs -f api

build:
\tnpm run build

dev:
\tnpm run dev

test:
\tnpm test

lint:
\tnpm run lint

bruno:
\tnpm run bruno

test-api:
\tnpm run test:api

openapi:
\tcurl http://localhost:3000/openapi.json

kafka-mode:
\tEVENT_BUS=kafka npm run dev
`;
}

function createAuthFiles(plan: ProjectPlan): PlannedFile[] {
  if (plan.capabilities.auth.length === 0) {
    return [];
  }

  const files: PlannedFile[] = [
    {
      path: "src/features/auth/domain/auth-user.ts",
      type: "config",
      owner: "auth",
      content: `import { AuthUser as SoapAuthUser } from '@soapjs/soap/http';

export interface AuthUser extends SoapAuthUser {
  name?: string;
}
`,
    },
    {
      path: "src/types/soap-express-auth.d.ts",
      type: "config",
      owner: "auth",
      content: `declare module '@soapjs/soap-express/auth' {
  export * from '@soapjs/soap-express/build/auth';
}
`,
    },
  ];

  if (usesJwtAuth(plan) || plan.capabilities.auth.includes("api-key")) {
    files.push({
      path: "src/features/auth/data/dev-users.ts",
      type: "config",
      owner: "auth",
      content: `import { AuthUser } from '../domain/auth-user';

export interface DevUser extends AuthUser {
  password: string;
}

export const devUsers: DevUser[] = [
  {
    id: 'dev-admin',
    email: 'admin@example.com',
    name: 'Dev Admin',
    password: 'admin123',
    roles: ['admin'],
  },
];

export function findDevUser(email: string): DevUser | undefined {
  return devUsers.find((user) => user.email === email);
}
`,
    });
  }

  files.push(
    {
      path: "src/features/auth/auth.setup.ts",
      type: "config",
      owner: "auth",
      content: createAuthSetupTs(plan),
    },
    {
      path: "src/features/auth/index.ts",
      type: "config",
      owner: "auth",
      content: createAuthIndexTs(plan),
    },
  );

  return files;
}

function usesJwtAuth(plan: ProjectPlan): boolean {
  return plan.capabilities.auth.includes("jwt") || plan.capabilities.auth.includes("local");
}

function createAuthSetupTs(plan: ProjectPlan): string {
  const imports = [
    "import { SoapAuth } from '@soapjs/soap-auth';",
    "import { createApiKeyAuthConfig, createJwtAuthConfig, createLocalAuthConfig } from '@soapjs/soap-auth/recipes';",
    "import { Logger } from '@soapjs/soap/common';",
    "import { AppConfig } from '../../config/config';",
    "import { AuthUser } from './domain/auth-user';",
    "import { devUsers, findDevUser } from './data/dev-users';",
  ];
  const httpConfigs: string[] = [];

  if (plan.capabilities.auth.includes("jwt")) {
    httpConfigs.push(`    jwt: createJwtConfig(config),`);
  }

  if (plan.capabilities.auth.includes("local") || plan.capabilities.auth.includes("jwt")) {
    httpConfigs.push(`    local: createLocalConfig(config),`);
  }

  if (plan.capabilities.auth.includes("api-key")) {
    httpConfigs.push(`    apiKey: createApiKeyConfig(config),`);
  }

  return `${imports.join("\n")}

interface DevLoginPayload {
  identifier?: string;
  email?: string;
  password?: string;
}

function safeUser(user: AuthUser & { password?: string }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
  };
}

async function fetchUser(payload: unknown): Promise<AuthUser | null> {
  const id = typeof payload === 'object' && payload !== null && 'id' in payload ? String((payload as { id: unknown }).id) : undefined;
  const email = typeof payload === 'string'
    ? payload
    : typeof payload === 'object' && payload !== null && 'email' in payload
      ? String((payload as { email: unknown }).email)
      : undefined;
  const user = id
    ? devUsers.find((candidate) => candidate.id === id)
    : email
      ? findDevUser(email)
      : undefined;

  return user ? safeUser(user) : null;
}

function createJwtConfig(config: AppConfig) {
  return createJwtAuthConfig({
    accessSecret: config.jwtAccessSecret,
    refreshSecret: config.jwtRefreshSecret,
    user: { fetchUser },
    accessToken: {
      options: { expiresIn: '15m' },
      buildPayload: (user: AuthUser) => ({ id: user.id, email: user.email, roles: user.roles }),
    },
    refreshToken: {
      options: { expiresIn: '7d' },
      buildPayload: (user: AuthUser) => ({ id: user.id }),
    },
    routes: {
      login: { path: '/auth/login' },
      refresh: { path: '/auth/refresh' },
      logout: { path: '/auth/logout' },
    },
  });
}

function createLocalConfig(_config: AppConfig) {
  return createLocalAuthConfig({
    basePath: '/auth',
    credentials: {
      extractCredentials: <TCredentials>(context: unknown): TCredentials => {
        const authContext = context as { body?: DevLoginPayload; req?: { body?: DevLoginPayload } };
        const body = authContext.body ?? authContext.req?.body ?? {};
        return {
          identifier: body.identifier ?? body.email ?? '',
          password: body.password ?? '',
        } as TCredentials;
      },
      verifyCredentials: async (identifier: string, password: string) => {
        const user = findDevUser(identifier);
        return user?.password === password;
      },
    },
    user: { fetchUser },
    routes: {
      login: { path: '/auth/login' },
      logout: { path: '/auth/logout' },
    },
  });
}

function createApiKeyConfig(config: AppConfig) {
  return createApiKeyAuthConfig({
    keyType: 'long-term',
    extractApiKey: (context: unknown) => {
      const authContext = context as { req?: { headers?: Record<string, string | string[] | undefined> }; headers?: Record<string, string | string[] | undefined> };
      const headers = authContext.req?.headers ?? authContext.headers ?? {};
      const value = headers[config.apiKeyHeader.toLowerCase()];
      return Array.isArray(value) ? value[0] ?? null : value ?? null;
    },
    retrieveUserByApiKey: async (apiKey: string): Promise<AuthUser | null> => {
      if (apiKey !== config.devApiKey) {
        return null;
      }

      return {
        id: 'api-key-client',
        email: 'api-key@example.com',
        name: 'API Key Client',
        roles: ['admin'],
      };
    },
    trackApiKeyUsage: async (_apiKey: string) => undefined,
  });
}

export async function createAuthProvider(config: AppConfig, logger?: Logger): Promise<SoapAuth> {
  return SoapAuth.create({
    logger,
    http: {
${httpConfigs.join("\n")}
    },
  });
}
`;
}

function createAuthIndexTs(plan: ProjectPlan): string {
  const exports = ["export * from './auth.setup';", "export * from './domain/auth-user';"];

  return `${exports.join("\n")}\n`;
}

function createFeaturesIndexTs(plan: ProjectPlan): string {
  const exports: string[] = [];

  if (plan.capabilities.auth.length > 0) {
    exports.push("export * from './auth';");
  }

  return exports.length > 0 ? `${exports.join("\n")}\n` : "export {};\n";
}

function createBrunoFiles(plan: ProjectPlan): PlannedFile[] {
  if (!plan.capabilities.apiClient.includes("bruno")) {
    return [];
  }

  const files: PlannedFile[] = [
    {
      path: "bruno/bruno.json",
      type: "bruno",
      content: JSON.stringify({ version: "1", name: plan.name, type: "collection" }, null, 2),
    },
    {
      path: "bruno/Health/health.bru",
      type: "bruno",
      content: `meta {
  name: Health
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/health
  body: none
  auth: none
}

tests {
  function onResponse(request, response) {
    expect(response.status).to.be.within(200, 299);
  }
}
`,
    },
    {
      path: "bruno/environments/Local.bru",
      type: "bruno",
      content: `vars {
  baseUrl: http://localhost:3000
  accessToken:
  apiKey:
  id:
  email: admin@example.com
  password: admin123
}
`,
    },
  ];

  if (usesJwtAuth(plan)) {
    files.push(
      {
        path: "bruno/Auth/login.bru",
        type: "bruno",
        owner: "auth",
        content: createBrunoLoginBru(2),
      },
      {
        path: "bruno/Auth/me.bru",
        type: "bruno",
        owner: "auth",
        content: createBrunoRequestBru({
          name: "Me",
          method: "GET",
          path: "/auth/me",
          sequence: 3,
          auth: "jwt",
        }),
      }
    );
  }

  return files;
}

function createBrunoLoginBru(sequence: number): string {
  return `meta {
  name: Login
  type: http
  seq: ${sequence}
}

post {
  url: {{baseUrl}}/auth/login
  body: json
  auth: none
}

body:json {
  {
    "email": "{{email}}",
    "password": "{{password}}"
  }
}

script:post-response {
  const data = res.getBody();
  if (data?.accessToken) {
    bru.setEnvVar("accessToken", data.accessToken);
  }
}

tests {
  function onResponse(request, response) {
    expect(response.status).to.be.within(200, 299);
    const body = response.getBody();
    expect(body.accessToken).to.be.a('string').and.not.empty;
  }
}
`;
}

function createBrunoRequestBru(options: {
  name: string;
  method: string;
  path: string;
  sequence: number;
  auth: "none" | "jwt" | "api-key";
  includeJsonBody?: boolean;
  expectBody?: boolean;
}): string {
  const method = options.method.toLowerCase();
  const bodyType = options.includeJsonBody ? "json" : "none";
  const authBlock =
    options.auth === "jwt"
      ? `
headers {
  Authorization: Bearer {{accessToken}}
}
`
      : options.auth === "api-key"
        ? `
headers {
  x-api-key: {{apiKey}}
}
`
        : "";
  const bodyBlock = options.includeJsonBody
    ? `
body:json {
  {
    "name": "Example"
  }
}
`
    : "";
  const bodyExpectation = options.expectBody
    ? `
    expect(response.getBody()).to.exist;
`
    : "";
  const testsBlock = `
tests {
  function onResponse(request, response) {
    expect(response.status).to.be.within(200, 299);${bodyExpectation}
  }
}
`;

  return `meta {
  name: ${options.name}
  type: http
  seq: ${options.sequence}
}

${method} {
  url: {{baseUrl}}${options.path}
  body: ${bodyType}
  auth: none
}
${authBlock}${bodyBlock}${testsBlock}`;
}
