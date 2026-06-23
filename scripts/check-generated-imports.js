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
  createDatabaseFile,
  createResourceFiles,
  parseCrudRouteMatrix,
} = require("../build/commands/add/resource-plan");
const { createUseCaseFiles } = require("../build/commands/add/use-case-plan");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "soap-cli-generated-imports-"));

try {
  writeSoapStub(tempRoot);

  const standaloneUseCaseFiles = createUseCaseFiles({
    name: "publishComic",
    feature: "comics",
    featuresRoot: "src/features",
  });
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
    ...resourceFiles.filter((file) =>
      file.path.includes("/domain/") ||
      file.path.includes("/application/ports/") ||
      file.path.endsWith(".use-case.ts")
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
export interface UseCase<T = unknown> {
  execute(...args: unknown[]): Promise<Result<T>> | Result<T> | void;
}
`
  );
  writeFile(
    path.join(basePath, "node_modules/@soapjs/soap/common/index.d.ts"),
    `export declare class Result<T = unknown> {
  readonly content: T;
  static withSuccess<T>(content: T): Result<T>;
  static withFailure<T = never>(error: Error): Result<T>;
  isSuccess(): boolean;
}
export declare function Injectable(): ClassDecorator;
export declare function Inject(token: string): ParameterDecorator;
`
  );
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
