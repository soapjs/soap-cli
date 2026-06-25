const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const files = [
  "src/commands/add/resource-plan.ts",
  "src/commands/add/use-case-plan.ts",
];

const violations = [];

for (const file of files) {
  const absolutePath = path.join(root, file);
  const content = fs.readFileSync(absolutePath, "utf8");
  const pattern = /import\s+\{[^}]*\bUseCase\b[^}]*\}\s+from\s+['"]@soapjs\/soap\/common['"]/g;
  const matches = content.match(pattern);

  if (matches) {
    violations.push(`${file}: generated UseCase imports must come from @soapjs/soap, not @soapjs/soap/common`);
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

const {
  createControllersFile,
  createDatabaseFile,
  createResourceFiles,
  parseCrudRouteMatrix,
} = require("../build/commands/add/resource-plan");
const {
  createRouteControllerFile,
  createRouteContractFile,
  createRouteContractSpecFile,
} = require("../build/commands/add/route-plan");
const { createControllerFile } = require("../build/commands/add/controller-plan");
const { createUseCaseFiles } = require("../build/commands/add/use-case-plan");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "soap-cli-generated-imports-"));

try {
  writeSoapStub(tempRoot);

  const standaloneUseCaseFiles = createUseCaseFiles({
    name: "publishComic",
    feature: "comics",
    featuresRoot: "src/features",
  });
  const standaloneRoutePlan = {
    resource: {
      name: "comics",
      path: "/comics",
      crud: false,
      db: "none",
      auth: "none",
      zone: "public",
      fields: [],
      generatedAt: "2026-01-01T00:00:00.000Z",
    },
    name: "publish",
    method: "post",
    path: "publish",
    useCase: "publishComic",
    auth: "none",
    zone: "public",
    featuresRoot: "src/features",
    contracts: "plain",
  };
  const standaloneRouteFiles = [
    createRouteControllerFile(standaloneRoutePlan),
    createRouteContractFile(standaloneRoutePlan),
    createRouteContractSpecFile(standaloneRoutePlan),
  ];
  const mockControllerFile = createControllerFile({
    name: "adminTools",
    feature: "comics",
    featuresRoot: "src/features",
  });
  const controllerConfigFile = createControllersFile(
    [],
    "src/features",
    [],
    [],
    [],
    [{ path: mockControllerFile.path, type: mockControllerFile.type }]
  );
  const resourceFiles = createResourceFiles({
    name: "comics",
    crud: true,
    db: "mongo",
    auth: "none",
    zone: "public",
    featuresRoot: "src/features",
    architecture: "regular",
    contracts: "plain",
    fields: [],
    crudRoutes: parseCrudRouteMatrix([]),
  });
  const postgresResourceFiles = createResourceFiles({
    name: "invoices",
    crud: true,
    db: "postgres",
    auth: "none",
    zone: "public",
    featuresRoot: "src/features",
    architecture: "regular",
    contracts: "plain",
    fields: [{ name: "title", type: "string", required: true }],
    crudRoutes: parseCrudRouteMatrix([]),
  });
  const cqrsResourceFiles = createResourceFiles({
    name: "articles",
    crud: true,
    db: "none",
    auth: "none",
    zone: "public",
    featuresRoot: "src/features",
    architecture: "cqrs",
    contracts: "plain",
    fields: [{ name: "title", type: "string", required: true }],
    crudRoutes: parseCrudRouteMatrix([]),
  });
  const databaseFile = createDatabaseFile(
    [
      {
        name: "invoices",
        path: "/invoices",
        crud: true,
        db: "postgres",
        auth: "none",
        zone: "public",
        fields: [{ name: "title", type: "string", required: true }],
        generatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    "src/features"
  );

  if (!postgresResourceFiles.some((file) => file.path === "src/features/invoices/data/invoice.seed.ts")) {
    throw new Error("postgres CRUD feature should generate a database seed file");
  }

  if (!databaseFile.content.includes("seedInvoiceDatabase")) {
    throw new Error("database runner should register generated feature seed functions");
  }

  const generatedFiles = [
    ...standaloneUseCaseFiles.filter((file) => file.path.endsWith(".use-case.ts")),
    ...standaloneRouteFiles,
    mockControllerFile,
    controllerConfigFile,
    ...resourceFiles.filter((file) =>
      file.path.includes("/domain/") ||
      file.path.includes("/application/ports/") ||
      file.path.endsWith(".use-case.ts") ||
      file.path.includes("/contracts/") ||
      file.path.includes("/api/")
    ),
    ...cqrsResourceFiles.filter((file) =>
      file.path.includes("/domain/") ||
      file.path.includes("/application/ports/") ||
      file.path.endsWith(".command.ts") ||
      file.path.endsWith(".query.ts") ||
      file.path.includes("/contracts/") ||
      file.path.includes("/api/")
    ),
  ];

  for (const file of generatedFiles) {
    writeFile(path.join(tempRoot, file.path), file.content);
  }

  const sourceFiles = generatedFiles.map((file) => path.join(tempRoot, file.path));
  const program = ts.createProgram(sourceFiles, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    strict: true,
    esModuleInterop: true,
    experimentalDecorators: true,
    skipLibCheck: true,
    noEmit: true,
    types: ["node"],
    typeRoots: [path.join(root, "node_modules", "@types")],
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length > 0) {
    const host = {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => tempRoot,
      getNewLine: () => "\n",
    };
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
    process.exit(1);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function writeSoapStub(basePath) {
  writeFile(
    path.join(basePath, "node_modules/express/package.json"),
    JSON.stringify({
      name: "express",
      version: "0.0.0-test",
      types: "index.d.ts",
    }, null, 2)
  );
  writeFile(
    path.join(basePath, "node_modules/express/index.d.ts"),
    `export interface Request {
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
}
export interface Response {
  status(code: number): this;
  json(body?: unknown): this;
  end(): this;
}
`
  );
  writeFile(
    path.join(basePath, "node_modules/@soapjs/soap/package.json"),
    JSON.stringify({
      name: "@soapjs/soap",
      version: "0.0.0-test",
      types: "index.d.ts",
    }, null, 2)
  );
  writeFile(
    path.join(basePath, "node_modules/@soapjs/soap/index.d.ts"),
    `import { Result } from './common';
export * from './common';
export type UpdateStats = { status: string; modifiedCount?: number; upsertedCount?: number; upsertedIds?: unknown[] };
export type RemoveStats = { status: string; deletedCount?: number };
export declare abstract class ReadOnlyRepository<EntityType = unknown> {
  abstract count(...args: unknown[]): Promise<Result<number>>;
  abstract find(...args: unknown[]): Promise<Result<EntityType[]>>;
}
export declare abstract class Repository<EntityType = unknown> extends ReadOnlyRepository<EntityType> {
  abstract aggregate<ResultType = EntityType | EntityType[]>(...args: unknown[]): Promise<Result<ResultType>>;
  abstract update(...args: unknown[]): Promise<Result<UpdateStats>>;
  abstract add(...entities: EntityType[]): Promise<Result<EntityType[]>>;
  abstract remove(...args: unknown[]): Promise<Result<RemoveStats>>;
}
export interface UseCase<T = unknown> {
  execute(...args: unknown[]): Promise<Result<T>> | Result<T> | void;
}
`
  );
  writeFile(
    path.join(basePath, "node_modules/@soapjs/soap/cqrs/index.d.ts"),
    `import { Result } from '../common';
export declare class BaseCommand<TResult = void> {
  constructor(initiatedBy?: string, correlationId?: string);
}
export declare class BaseQuery<TResult = void> {
  constructor(initiatedBy?: string, correlationId?: string);
}
export interface CommandBus {
  dispatch<TResult>(command: unknown): Promise<Result<TResult>>;
}
export interface QueryBus {
  dispatch<TResult>(query: unknown): Promise<Result<TResult>>;
}
`
  );
  writeFile(
    path.join(basePath, "node_modules/@soapjs/soap/common/index.d.ts"),
    `export declare class Result<T = unknown> {
  readonly content: T;
  readonly failure: Error | undefined;
  static withSuccess<T>(content: T): Result<T>;
  static withFailure<T = never>(error: Error): Result<T>;
  isSuccess(): boolean;
  isFailure(): this is Result<T> & { failure: Error };
}
export declare function Injectable(): ClassDecorator;
export declare function Inject(token: string): ParameterDecorator;
`
  );
  writeFile(
    path.join(basePath, "node_modules/@soapjs/soap-express/package.json"),
    JSON.stringify({
      name: "@soapjs/soap-express",
      version: "0.0.0-test",
      types: "index.d.ts",
    }, null, 2)
  );
  writeFile(
    path.join(basePath, "node_modules/@soapjs/soap-express/index.d.ts"),
    `import { Result } from '@soapjs/soap';
export declare function AdminOnly(strategy: string): MethodDecorator;
export declare function Auth(strategy: string, policy?: unknown): MethodDecorator;
export declare function CallUseCase(useCaseClass: unknown): MethodDecorator;
export declare function Controller(path: string, options?: unknown): ClassDecorator;
export declare function Delete(path: string, options?: unknown): MethodDecorator;
export declare function Get(path: string, options?: unknown): MethodDecorator;
export declare function Inject(token: string): ParameterDecorator;
export declare function Patch(path: string, options?: unknown): MethodDecorator;
export declare function Post(path: string, options?: unknown): MethodDecorator;
export declare function Public(): MethodDecorator;
export declare function Put(path: string, options?: unknown): MethodDecorator;
export declare function RouteIO(io: unknown): MethodDecorator;
export declare class ResultMapper {
  static toResponse<T>(result: Result<T>, response: unknown, options?: { successStatus?: number; transform?: (content: T) => unknown }): void;
}
`
  );
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
