import path from "path";
import {
  ApiZone,
  AuthPolicy,
  AuthCapability,
  DatabaseCapability,
  ResourceFieldDefinition,
  ResourceFieldType,
  ResourceRegistryEntry,
} from "../../config/schemas/types";
import { CliError } from "../../core/errors";
import { createAuthPolicyArgument, parseAuthPolicy } from "../../config/auth-policy";
import { PlannedFile } from "../../io/file-writer";
import {
  createControllersTs,
  ControllerRegistration,
  createResourcesTs,
  ResourceRegistration,
} from "../create/project-plan";
import { createNameVariants } from "../../templates/naming";

export interface AddResourcePlan {
  name: string;
  crud: boolean;
  db: "none" | DatabaseCapability;
  auth: "none" | AuthCapability;
  zone: ApiZone;
  featuresRoot: string;
  architecture?: "regular" | "cqrs";
  contracts?: "plain" | "zod";
  fields?: ResourceFieldDefinition[];
  crudRoutes?: CrudRouteMatrix;
  policy?: AuthPolicy;
}

export type CrudOperation = "list" | "get" | "create" | "update" | "delete";

export interface CrudRouteConfig {
  method?: "get" | "post" | "put" | "patch" | "delete";
  path?: string;
  auth?: "none" | AuthCapability;
  zone?: ApiZone;
  bruno?: boolean;
  policy?: AuthPolicy;
}

export type CrudRouteMatrix = Partial<Record<CrudOperation, CrudRouteConfig>>;
type SqlDatabaseCapability = Extract<DatabaseCapability, "postgres" | "mysql" | "sqlite">;

export interface ResourceAddPlanningOptions extends AddResourcePlan {
  architecture: "regular" | "cqrs";
}

export interface ResourceAddPlanningStep {
  type: "entity" | "repository" | "use-case" | "command" | "query" | "route" | "contract" | "bruno";
  name: string;
}

export interface ResourceAddPlanningSummary {
  resource: string;
  architecture: "regular" | "cqrs";
  steps: ResourceAddPlanningStep[];
}

export function createResourceEntry(plan: AddResourcePlan): ResourceRegistryEntry {
  const names = createNameVariants(plan.name);

  return {
    name: names.kebabName,
    path: `/${names.pluralName}`,
    crud: plan.crud,
    db: plan.db,
    auth: plan.auth,
    zone: plan.zone,
    fields: normalizeResourceFields(plan.fields),
    policy: plan.policy,
    generatedAt: new Date().toISOString(),
  };
}

export function createResourceAddPlanningSummary(plan: ResourceAddPlanningOptions): ResourceAddPlanningSummary {
  const names = createNameVariants(plan.name);
  const itemName = singularizeResourceName(names.kebabName);
  const collectionName = createNameVariants(itemName).pluralName;
  const steps: ResourceAddPlanningStep[] = [
    { type: "entity", name: itemName },
    { type: "repository", name: `${itemName} port` },
  ];

  if (plan.db !== "none") {
    steps.push({ type: "repository", name: `${itemName} ${plan.db} implementation` });
  } else {
    steps.push({ type: "repository", name: `${itemName} in-memory implementation` });
  }

  if (plan.architecture === "cqrs") {
    steps.push(
      { type: "command", name: `create-${itemName}` },
      { type: "query", name: `get-${itemName}` },
      { type: "query", name: `list-${collectionName}` }
    );

    if (plan.crud) {
      steps.push(
        { type: "command", name: `update-${itemName}` },
        { type: "command", name: `delete-${itemName}` }
      );
    }
  } else {
    steps.push(
      { type: "use-case", name: `create-${itemName}` },
      { type: "use-case", name: `get-${itemName}` },
      { type: "use-case", name: `list-${collectionName}` }
    );

    if (plan.crud) {
      steps.push(
        { type: "use-case", name: `update-${itemName}` },
        { type: "use-case", name: `delete-${itemName}` }
      );
    }
  }

  const itemNames = createNameVariants(itemName);
  const collectionNames = createNameVariants(collectionName);
  const routeActions = createRegularCrudActions(itemNames, collectionNames, plan.crudRoutes)
    .filter((action) => plan.crud || action.kind === "list" || action.kind === "get");

  steps.push(...routeActions.map((action) => ({
    type: "route" as const,
    name: `${action.method.toUpperCase()} ${resolveCrudSummaryPath(`/${names.pluralName}`, action.path)}`,
  })));

  steps.push(
    { type: "contract", name: `${names.kebabName} route contracts` },
    { type: "bruno", name: `${names.kebabName} requests` }
  );

  return {
    resource: names.kebabName,
    architecture: plan.architecture,
    steps,
  };
}

export function formatResourceAddPlanningSummary(summary: ResourceAddPlanningSummary): string {
  const lines = [
    `Resource plan: ${summary.resource} (${summary.architecture})`,
    ...summary.steps.map((step) => `- ${step.type}: ${step.name}`),
  ];

  return lines.join("\n");
}

function singularizeResourceName(name: string): string {
  if (name.endsWith("ies")) {
    return `${name.slice(0, -3)}y`;
  }

  if (name.endsWith("ses") || name.endsWith("xes") || name.endsWith("zes") || name.endsWith("ches") || name.endsWith("shes")) {
    return name.slice(0, -2);
  }

  if (name.endsWith("s") && name.length > 1) {
    return name.slice(0, -1);
  }

  return name;
}

export function createResourceFiles(plan: AddResourcePlan): PlannedFile[] {
  if (plan.architecture === "cqrs" && plan.crud) {
    return createCqrsCrudResourceFiles(plan);
  }

  if (plan.architecture === "regular" && plan.crud) {
    return createRegularCrudResourceFiles(plan);
  }

  const names = createNameVariants(plan.name);
  const root = path.posix.join(plan.featuresRoot, names.kebabName);
  const controllerPath = `${root}/api/${names.kebabName}.controller.ts`;
  const files: PlannedFile[] = [
    {
      path: `${root}/domain/${names.kebabName}.entity.ts`,
      type: "entity",
      owner: names.kebabName,
      content: createEntityTs(plan.name, plan.fields),
    },
    {
      path: `${root}/application/ports/${names.kebabName}.repository.ts`,
      type: "repository",
      owner: names.kebabName,
      content: createRepositoryPortTs(plan.name),
    },
    {
      path: `${root}/data/${names.kebabName}.memory-repository.ts`,
      type: "repository",
      owner: names.kebabName,
      content: createMemoryRepositoryTs(plan.name),
    },
    ...(plan.db === "mongo"
      ? [
          {
            path: `${root}/data/${names.kebabName}.mongo-repository.ts`,
            type: "repository" as const,
            owner: names.kebabName,
            content: createMongoRepositoryTs(plan.name, plan.fields),
          },
        ]
      : []),
    ...(isSqlDatabase(plan.db)
      ? [
          {
            path: `${root}/data/${names.kebabName}.sql-repository.ts`,
            type: "repository" as const,
            owner: names.kebabName,
            content: createSqlRepositoryTs(plan.name, plan.db, plan.fields),
          },
        ]
      : []),
    {
      path: `${root}/application/use-cases/${names.kebabName}.use-cases.ts`,
      type: "use-case",
      owner: names.kebabName,
      content: createUseCasesTs(plan.name),
    },
    {
      path: `${root}/setup.ts`,
      type: "resource",
      owner: names.kebabName,
      content: createSetupTs(plan.name, plan.db),
    },
    {
      path: controllerPath,
      type: "resource",
      owner: names.kebabName,
      content: createControllerTs(plan),
    },
    {
      path: `${root}/index.ts`,
      type: "resource",
      owner: names.kebabName,
      content: createFeatureIndexTs(plan.name),
    },
  ];

  return files;
}

function createCqrsCrudResourceFiles(plan: AddResourcePlan): PlannedFile[] {
  const featureNames = createNameVariants(plan.name);
  const itemNames = createNameVariants(singularizeResourceName(featureNames.kebabName));
  const collectionNames = createNameVariants(itemNames.pluralName);
  const root = path.posix.join(plan.featuresRoot, featureNames.kebabName);
  const actions = createRegularCrudActions(itemNames, collectionNames, plan.crudRoutes);
  const commands = actions.filter((action) => action.kind === "create" || action.kind === "update" || action.kind === "delete");
  const queries = actions.filter((action) => action.kind === "list" || action.kind === "get");
  const resource = createResourceEntry(plan);

  return [
    {
      path: `${root}/domain/${itemNames.kebabName}.entity.ts`,
      type: "entity",
      owner: featureNames.kebabName,
      content: createEntityTs(itemNames.kebabName, plan.fields),
    },
    {
      path: `${root}/domain/${itemNames.kebabName}.entity.spec.ts`,
      type: "entity",
      owner: featureNames.kebabName,
      content: createEntitySpecTs(itemNames, plan.fields),
    },
    {
      path: `${root}/application/ports/${itemNames.kebabName}-repository.port.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createRegularCrudRepositoryPortTs(itemNames),
    },
    {
      path: `${root}/data/${itemNames.kebabName}.memory-repository.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createRegularCrudMemoryRepositoryTs(itemNames),
    },
    {
      path: `${root}/data/${itemNames.kebabName}.memory-repository.spec.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createRegularCrudMemoryRepositorySpecTs(itemNames, plan.fields),
    },
    ...(plan.db === "mongo"
      ? [
          {
            path: `${root}/data/${itemNames.kebabName}.repository.mongo.ts`,
            type: "repository" as const,
            owner: featureNames.kebabName,
            content: createRegularCrudMongoRepositoryTs(itemNames, plan.fields),
          },
        ]
      : []),
    ...(isSqlDatabase(plan.db)
      ? [
          {
            path: `${root}/data/${itemNames.kebabName}.repository.sql.ts`,
            type: "repository" as const,
            owner: featureNames.kebabName,
            content: createRegularCrudSqlRepositoryTs(itemNames, plan.db, plan.fields),
          },
        ]
      : []),
    ...commands.flatMap((action) => createCqrsCrudCommandFiles(root, featureNames, itemNames, action)),
    ...queries.flatMap((action) => createCqrsCrudQueryFiles(root, featureNames, itemNames, action)),
    {
      path: `${root}/application/commands/index.ts`,
      type: "config",
      owner: featureNames.kebabName,
      content: createCqrsCrudCommandIndexTs(commands),
    },
    {
      path: `${root}/application/queries/index.ts`,
      type: "config",
      owner: featureNames.kebabName,
      content: createCqrsCrudQueryIndexTs(queries),
    },
    ...actions.map((action) => ({
      path: `${root}/contracts/${action.name}.contract.ts`,
      type: "route" as const,
      owner: featureNames.kebabName,
      content: createRegularCrudContractTs(action, plan),
    })),
    ...actions.map((action) => ({
      path: `${root}/api/${action.name}.controller.ts`,
      type: "route" as const,
      owner: featureNames.kebabName,
      content: createCqrsCrudControllerTs(action, resource, plan),
    })),
    {
      path: `${root}/api/${featureNames.kebabName}.controllers.ts`,
      type: "config",
      owner: featureNames.kebabName,
      content: createRegularCrudControllersIndexTs(featureNames, actions),
    },
    {
      path: `${root}/setup.ts`,
      type: "resource",
      owner: featureNames.kebabName,
      content: createCqrsCrudSetupTs(featureNames, itemNames, plan.db),
    },
    {
      path: `${root}/index.ts`,
      type: "resource",
      owner: featureNames.kebabName,
      content: createCqrsCrudFeatureIndexTs(featureNames, itemNames),
    },
  ];
}

function createRegularCrudResourceFiles(plan: AddResourcePlan): PlannedFile[] {
  const featureNames = createNameVariants(plan.name);
  const itemNames = createNameVariants(singularizeResourceName(featureNames.kebabName));
  const collectionNames = createNameVariants(itemNames.pluralName);
  const root = path.posix.join(plan.featuresRoot, featureNames.kebabName);
  const actions = createRegularCrudActions(itemNames, collectionNames, plan.crudRoutes);
  const files: PlannedFile[] = [
    {
      path: `${root}/domain/${itemNames.kebabName}.entity.ts`,
      type: "entity",
      owner: featureNames.kebabName,
      content: createEntityTs(itemNames.kebabName, plan.fields),
    },
    {
      path: `${root}/domain/${itemNames.kebabName}.entity.spec.ts`,
      type: "entity",
      owner: featureNames.kebabName,
      content: createEntitySpecTs(itemNames, plan.fields),
    },
    {
      path: `${root}/application/ports/${itemNames.kebabName}-repository.port.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createRegularCrudRepositoryPortTs(itemNames),
    },
    {
      path: `${root}/data/${itemNames.kebabName}.memory-repository.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createRegularCrudMemoryRepositoryTs(itemNames),
    },
    {
      path: `${root}/data/${itemNames.kebabName}.memory-repository.spec.ts`,
      type: "repository",
      owner: featureNames.kebabName,
      content: createRegularCrudMemoryRepositorySpecTs(itemNames, plan.fields),
    },
    ...(plan.db === "mongo"
      ? [
          {
            path: `${root}/data/${itemNames.kebabName}.repository.mongo.ts`,
            type: "repository" as const,
            owner: featureNames.kebabName,
            content: createRegularCrudMongoRepositoryTs(itemNames, plan.fields),
          },
        ]
      : []),
    ...(isSqlDatabase(plan.db)
      ? [
          {
            path: `${root}/data/${itemNames.kebabName}.repository.sql.ts`,
            type: "repository" as const,
            owner: featureNames.kebabName,
            content: createRegularCrudSqlRepositoryTs(itemNames, plan.db, plan.fields),
          },
        ]
      : []),
    ...actions.map((action) => ({
      path: `${root}/application/use-cases/${action.name}.use-case.ts`,
      type: "use-case" as const,
      owner: featureNames.kebabName,
      content: createRegularCrudUseCaseTs(action, itemNames),
    })),
    ...actions.map((action) => ({
      path: `${root}/application/use-cases/${action.name}.use-case.spec.ts`,
      type: "use-case" as const,
      owner: featureNames.kebabName,
      content: createRegularCrudUseCaseSpecTs(action, itemNames, plan.fields),
    })),
    ...actions.map((action) => ({
      path: `${root}/contracts/${action.name}.contract.ts`,
      type: "route" as const,
      owner: featureNames.kebabName,
      content: createRegularCrudContractTs(action, plan),
    })),
    ...actions.map((action) => ({
      path: `${root}/api/${action.name}.controller.ts`,
      type: "route" as const,
      owner: featureNames.kebabName,
      content: createRegularCrudControllerTs(action, itemNames, featureNames, plan),
    })),
    {
      path: `${root}/api/${featureNames.kebabName}.controllers.ts`,
      type: "config",
      owner: featureNames.kebabName,
      content: createRegularCrudControllersIndexTs(featureNames, actions),
    },
    {
      path: `${root}/setup.ts`,
      type: "resource",
      owner: featureNames.kebabName,
      content: createRegularCrudSetupTs(featureNames, itemNames, actions, plan.db),
    },
    {
      path: `${root}/index.ts`,
      type: "resource",
      owner: featureNames.kebabName,
      content: createRegularCrudFeatureIndexTs(featureNames, itemNames),
    },
  ];

  return files;
}

function createCqrsCrudCommandFiles(
  root: string,
  featureNames: ReturnType<typeof createNameVariants>,
  itemNames: ReturnType<typeof createNameVariants>,
  action: RegularCrudAction
): PlannedFile[] {
  return [
    {
      path: `${root}/application/commands/${action.name}.command.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createCqrsCrudCommandTs(action),
    },
    {
      path: `${root}/application/commands/${action.name}.handler.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createCqrsCrudCommandHandlerTs(action, itemNames),
    },
    {
      path: `${root}/application/commands/${action.name}.handler.spec.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createCqrsCrudCommandSpecTs(action),
    },
  ];
}

function createCqrsCrudQueryFiles(
  root: string,
  featureNames: ReturnType<typeof createNameVariants>,
  itemNames: ReturnType<typeof createNameVariants>,
  action: RegularCrudAction
): PlannedFile[] {
  return [
    {
      path: `${root}/application/queries/${action.name}.query.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createCqrsCrudQueryTs(action),
    },
    {
      path: `${root}/application/queries/${action.name}.handler.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createCqrsCrudQueryHandlerTs(action, itemNames),
    },
    {
      path: `${root}/application/queries/${action.name}.handler.spec.ts`,
      type: "use-case",
      owner: featureNames.kebabName,
      content: createCqrsCrudQuerySpecTs(action),
    },
  ];
}

function createCqrsCrudCommandTs(action: RegularCrudAction): string {
  return `import { BaseCommand } from '@soapjs/soap/cqrs';

export interface ${action.classBase}Payload {
  [key: string]: unknown;
}

export interface ${action.classBase}Result {
  [key: string]: unknown;
}

export class ${action.classBase}Command extends BaseCommand<${action.classBase}Result> {
  constructor(
    public readonly payload: ${action.classBase}Payload = {},
    initiatedBy?: string,
    correlationId?: string
  ) {
    super(initiatedBy, correlationId);
  }
}
`;
}

function createCqrsCrudQueryTs(action: RegularCrudAction): string {
  return `import { BaseQuery } from '@soapjs/soap/cqrs';

export interface ${action.classBase}Criteria {
  [key: string]: unknown;
}

export interface ${action.classBase}Result {
  [key: string]: unknown;
}

export class ${action.classBase}Query extends BaseQuery<${action.classBase}Result> {
  constructor(
    public readonly criteria: ${action.classBase}Criteria = {},
    initiatedBy?: string,
    correlationId?: string
  ) {
    super(initiatedBy, correlationId);
  }
}
`;
}

function createCqrsCrudCommandHandlerTs(action: RegularCrudAction, itemNames: ReturnType<typeof createNameVariants>): string {
  const repositoryCall = createCqrsCrudCommandRepositoryCall(action, itemNames);

  return `import { Result } from '@soapjs/soap/common';
import { CommandHandler as SoapCommandHandler } from '@soapjs/soap/cqrs';
import { CommandHandler } from '@soapjs/soap-express/cqrs';
import { ${itemNames.pascalName}Repository } from '../ports/${itemNames.kebabName}-repository.port';
import { ${itemNames.pascalName}Props } from '../../domain/${itemNames.kebabName}.entity';
import { ${action.classBase}Command, ${action.classBase}Result } from './${action.name}.command';

@CommandHandler(${action.classBase}Command)
export class ${action.classBase}Handler implements SoapCommandHandler<${action.classBase}Command, ${action.classBase}Result> {
  constructor(private readonly repository?: ${itemNames.pascalName}Repository) {}

  async handle(command: ${action.classBase}Command): Promise<Result<${action.classBase}Result>> {
    try {
${repositoryCall}
    } catch (error) {
      return Result.withFailure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
`;
}

function createCqrsCrudQueryHandlerTs(action: RegularCrudAction, itemNames: ReturnType<typeof createNameVariants>): string {
  const repositoryCall = createCqrsCrudQueryRepositoryCall(action);

  return `import { Result } from '@soapjs/soap/common';
import { QueryHandler as SoapQueryHandler } from '@soapjs/soap/cqrs';
import { QueryHandler } from '@soapjs/soap-express/cqrs';
import { ${itemNames.pascalName}Repository } from '../ports/${itemNames.kebabName}-repository.port';
import { ${action.classBase}Query, ${action.classBase}Result } from './${action.name}.query';

@QueryHandler(${action.classBase}Query)
export class ${action.classBase}Handler implements SoapQueryHandler<${action.classBase}Query, ${action.classBase}Result> {
  constructor(private readonly repository?: ${itemNames.pascalName}Repository) {}

  async handle(query: ${action.classBase}Query): Promise<Result<${action.classBase}Result>> {
    try {
${repositoryCall}
    } catch (error) {
      return Result.withFailure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
`;
}

function createCqrsCrudCommandRepositoryCall(action: RegularCrudAction, itemNames: ReturnType<typeof createNameVariants>): string {
  const kind = action.kind;

  if (kind === "create") {
    return `      if (!this.repository) return Result.withSuccess({ ...command.payload } as ${action.classBase}Result);
      const item = await this.repository.create(command.payload as Omit<${itemNames.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'>);
      return Result.withSuccess(item.props as unknown as ${action.classBase}Result);`;
  }

  if (kind === "update") {
    return `      if (!this.repository) return Result.withSuccess({ ...command.payload } as ${action.classBase}Result);
      const { id, ...changes } = command.payload;
      const item = await this.repository.update(String(id), changes);
      return Result.withSuccess((item?.props ?? { id, ...changes }) as unknown as ${action.classBase}Result);`;
  }

  return `      if (!this.repository) return Result.withSuccess({ deleted: true, ...command.payload } as ${action.classBase}Result);
      const deleted = await this.repository.delete(String(command.payload.id));
      return Result.withSuccess({ deleted });`;
}

function createCqrsCrudQueryRepositoryCall(action: RegularCrudAction): string {
  const kind = action.kind;

  if (kind === "list") {
    return `      if (!this.repository) return Result.withSuccess({ items: [] } as ${action.classBase}Result);
      const items = await this.repository.list();
      return Result.withSuccess({ items: items.map((item) => item.props) });`;
  }

  return `      if (!this.repository) return Result.withSuccess({ ...query.criteria } as ${action.classBase}Result);
      const item = await this.repository.findById(String(query.criteria.id));
      return Result.withSuccess((item?.props ?? { ...query.criteria }) as unknown as ${action.classBase}Result);`;
}

function createCqrsCrudCommandSpecTs(action: RegularCrudAction): string {
  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { Result } from '@soapjs/soap/common';
import { InMemoryCommandBus } from '@soapjs/soap/cqrs';
import { ${action.classBase}Command, ${action.classBase}Result } from './${action.name}.command';
import { ${action.classBase}Handler } from './${action.name}.handler';

test('${action.classBase}Command can be dispatched through a CQRS command bus', async () => {
  const bus = new InMemoryCommandBus();
  bus.register(${action.classBase}Command, new ${action.classBase}Handler());

  const result: Result<${action.classBase}Result> = await bus.dispatch(new ${action.classBase}Command({ id: 'existing-id', name: 'Ada' }));

  assert.equal(result.isSuccess(), true);
});
`;
}

function createCqrsCrudQuerySpecTs(action: RegularCrudAction): string {
  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { Result } from '@soapjs/soap/common';
import { InMemoryQueryBus } from '@soapjs/soap/cqrs';
import { ${action.classBase}Query, ${action.classBase}Result } from './${action.name}.query';
import { ${action.classBase}Handler } from './${action.name}.handler';

test('${action.classBase}Query can be dispatched through a CQRS query bus', async () => {
  const bus = new InMemoryQueryBus();
  bus.register(${action.classBase}Query, new ${action.classBase}Handler());

  const result: Result<${action.classBase}Result> = await bus.dispatch(new ${action.classBase}Query({ id: 'existing-id' }));

  assert.equal(result.isSuccess(), true);
});
`;
}

function createCqrsCrudCommandIndexTs(actions: RegularCrudAction[]): string {
  return `${actions
    .flatMap((action) => [`export * from './${action.name}.command';`, `export * from './${action.name}.handler';`])
    .join("\n")}
`;
}

function createCqrsCrudQueryIndexTs(actions: RegularCrudAction[]): string {
  return `${actions
    .flatMap((action) => [`export * from './${action.name}.query';`, `export * from './${action.name}.handler';`])
    .join("\n")}
`;
}

function createCqrsCrudControllerTs(action: RegularCrudAction, resource: ResourceRegistryEntry, plan: AddResourcePlan): string {
  const isCommand = action.kind === "create" || action.kind === "update" || action.kind === "delete";
  const busType = isCommand ? "CommandBus" : "QueryBus";
  const busProperty = isCommand ? "commandBus" : "queryBus";
  const messageType = isCommand ? "Command" : "Query";
  const folder = isCommand ? "commands" : "queries";
  const routeAuth = action.auth ?? plan.auth;
  const routeZone = action.zone ?? plan.zone;
  const routePolicy = action.policy ?? plan.policy;
  const authDecorator = createCqrsCrudAuthDecorator(routeAuth, routeZone, routePolicy);
  const authLine = authDecorator ? `  ${authDecorator}\n` : "";
  const imports = ["Controller", "Inject", action.method];

  if (authDecorator?.startsWith("@Public")) imports.push("Public");
  if (authDecorator?.startsWith("@Auth")) imports.push("Auth");
  if (authDecorator?.startsWith("@AdminOnly")) imports.push("AdminOnly");

  return `import { Request } from 'express';
import { ${Array.from(new Set(imports)).sort().join(", ")} } from '@soapjs/soap-express';
import { ${busType} } from '@soapjs/soap/cqrs';
import { ${action.classBase}${messageType} } from '../application/${folder}/${action.name}.${messageType.toLowerCase()}';
import { ${action.operationId}BodyContract } from '../contracts/${action.name}.contract';

@Controller('${resource.path}', {
  apiDoc: {
    tags: ['${createNameVariants(resource.name).pascalName}'],
    description: '${action.classBase} route generated by SoapJS CLI',
  },
})
export class ${action.classBase}Controller {
  constructor(@Inject('${busType}') private readonly ${busProperty}: ${busType}) {}

${authLine}  @${action.method}('${action.path}', ${createRouteApiDocOptions({
    summary: `${action.classBase} ${resource.name}`,
    operationId: action.operationId,
    auth: routeAuth,
  })})
  async ${action.operationId}(req: Request): Promise<unknown> {
    return this.${busProperty}.dispatch(new ${action.classBase}${messageType}(${action.operationId}BodyContract(req)));
  }
}
`;
}

function createCqrsCrudAuthDecorator(auth: "none" | AuthCapability, zone: ApiZone, policy?: AuthPolicy): string | undefined {
  if (zone === "public") {
    return "@Public()";
  }

  return createAuthDecorator(auth, zone, policy);
}

function createCqrsCrudSetupTs(
  featureNames: ReturnType<typeof createNameVariants>,
  itemNames: ReturnType<typeof createNameVariants>,
  db: "none" | DatabaseCapability
): string {
  return createRegularCrudSetupTs(featureNames, itemNames, [], db);
}

function createCqrsCrudFeatureIndexTs(
  featureNames: ReturnType<typeof createNameVariants>,
  itemNames: ReturnType<typeof createNameVariants>
): string {
  return `export * from './api/${featureNames.kebabName}.controllers';
export * from './domain/${itemNames.kebabName}.entity';
export * from './application/ports/${itemNames.kebabName}-repository.port';
export * from './application/commands';
export * from './application/queries';
export * from './data/${itemNames.kebabName}.memory-repository';
export * from './setup';
`;
}

export function createResourcesFile(resources: ResourceRegistryEntry[], featuresRoot: string): PlannedFile {
  const registrations: ResourceRegistration[] = resources.map((resource) => {
    const names = createNameVariants(resource.name);
    return {
      functionName: `register${names.pascalName}Dependencies`,
      importPath: `../${featuresRoot.replace(/^src\//, "")}/${names.kebabName}/setup`,
    };
  });

  return {
    path: "src/config/resources.ts",
    type: "config",
    content: createResourcesTs(registrations),
  };
}

export function createFeaturesIndexFile(resources: ResourceRegistryEntry[], authCapabilities: AuthCapability[] = []): PlannedFile {
  const exports: string[] = [];

  if (authCapabilities.includes("jwt") || authCapabilities.includes("local") || authCapabilities.includes("api-key")) {
    exports.push("export * from './auth';");
  }

  exports.push(
    ...resources
      .map((resource) => createNameVariants(resource.name).kebabName)
      .sort()
      .map((feature) => `export * from './${feature}';`)
  );

  return {
    path: "src/features/index.ts",
    type: "config",
    content: exports.length > 0 ? `${exports.join("\n")}\n` : "export {};\n",
  };
}

export function createControllersFile(
  resources: ResourceRegistryEntry[],
  featuresRoot: string,
  authCapabilities: AuthCapability[] = [],
  routeControllerIndexes: string[] = [],
  mainControllerResources: string[] = resources.map((resource) => resource.name)
): PlannedFile {
  const controllers: ControllerRegistration[] = [];
  const routeControllerIndexSet = new Set(routeControllerIndexes);
  const mainControllerResourceSet = new Set(mainControllerResources);

  if (authCapabilities.includes("jwt") || authCapabilities.includes("local")) {
    controllers.push({
      className: "AuthController",
      importPath: "../features/auth/api/auth.controller",
    });
  }

  controllers.push(...resources
    .filter((resource) => mainControllerResourceSet.has(resource.name))
    .map((resource) => {
    const names = createNameVariants(resource.name);
    return {
      className: `${names.pascalName}Controller`,
      importPath: `../${featuresRoot.replace(/^src\//, "")}/${names.kebabName}/api/${names.kebabName}.controller`,
    };
  }));

  controllers.push(...resources
    .filter((resource) => routeControllerIndexSet.has(resource.name))
    .map((resource) => {
      const names = createNameVariants(resource.name);
      return {
        className: `${names.pascalName}Controllers`,
        importPath: `../${featuresRoot.replace(/^src\//, "")}/${names.kebabName}/api/${names.kebabName}.controllers`,
        spread: true,
      };
    }));

  return {
    path: "src/config/controllers.ts",
    type: "config",
    content: createControllersTs(controllers),
  };
}

interface RegularCrudAction {
  name: string;
  classBase: string;
  method: "Get" | "Post" | "Put" | "Patch" | "Delete";
  path: string;
  operationId: string;
  kind: "list" | "get" | "create" | "update" | "delete";
  auth?: "none" | AuthCapability;
  zone?: ApiZone;
  bruno?: boolean;
  policy?: AuthPolicy;
}

function createRegularCrudActions(
  itemNames: ReturnType<typeof createNameVariants>,
  collectionNames: ReturnType<typeof createNameVariants>,
  matrix: CrudRouteMatrix = {}
): RegularCrudAction[] {
  return [
    {
      name: `list-${collectionNames.kebabName}`,
      classBase: `List${collectionNames.pascalName}`,
      method: toControllerMethod(matrix.list?.method, "Get"),
      path: matrix.list?.path ?? "/",
      operationId: `list${collectionNames.pascalName}`,
      kind: "list",
      auth: matrix.list?.auth,
      zone: matrix.list?.zone,
      bruno: matrix.list?.bruno,
      policy: matrix.list?.policy,
    },
    {
      name: `get-${itemNames.kebabName}`,
      classBase: `Get${itemNames.pascalName}`,
      method: toControllerMethod(matrix.get?.method, "Get"),
      path: matrix.get?.path ?? "/:id",
      operationId: `get${itemNames.pascalName}`,
      kind: "get",
      auth: matrix.get?.auth,
      zone: matrix.get?.zone,
      bruno: matrix.get?.bruno,
      policy: matrix.get?.policy,
    },
    {
      name: `create-${itemNames.kebabName}`,
      classBase: `Create${itemNames.pascalName}`,
      method: toControllerMethod(matrix.create?.method, "Post"),
      path: matrix.create?.path ?? "/",
      operationId: `create${itemNames.pascalName}`,
      kind: "create",
      auth: matrix.create?.auth,
      zone: matrix.create?.zone,
      bruno: matrix.create?.bruno,
      policy: matrix.create?.policy,
    },
    {
      name: `update-${itemNames.kebabName}`,
      classBase: `Update${itemNames.pascalName}`,
      method: toControllerMethod(matrix.update?.method, "Put"),
      path: matrix.update?.path ?? "/:id",
      operationId: `update${itemNames.pascalName}`,
      kind: "update",
      auth: matrix.update?.auth,
      zone: matrix.update?.zone,
      bruno: matrix.update?.bruno,
      policy: matrix.update?.policy,
    },
    {
      name: `delete-${itemNames.kebabName}`,
      classBase: `Delete${itemNames.pascalName}`,
      method: toControllerMethod(matrix.delete?.method, "Delete"),
      path: matrix.delete?.path ?? "/:id",
      operationId: `delete${itemNames.pascalName}`,
      kind: "delete",
      auth: matrix.delete?.auth,
      zone: matrix.delete?.zone,
      bruno: matrix.delete?.bruno,
      policy: matrix.delete?.policy,
    },
  ];
}

export function parseCrudRouteMatrix(values: string[] | undefined): CrudRouteMatrix {
  const matrix: CrudRouteMatrix = {};

  for (const value of values ?? []) {
    const [operation, method, ...rest] = value.split(":");
    const bruno = isCrudRouteBrunoToken(rest[rest.length - 1]) ? rest.pop() : undefined;
    const policy = isCrudRoutePolicyToken(rest[rest.length - 1]) ? rest.pop() : undefined;
    const zone = isCrudRouteZoneToken(rest[rest.length - 1]) ? rest.pop() : undefined;
    const auth = isCrudRouteAuthToken(rest[rest.length - 1]) ? rest.pop() : undefined;
    const routePath = rest.join(":");

    if (!isCrudOperation(operation)) {
      throw new CliError(`Invalid CRUD operation "${operation}". Allowed values: list, get, create, update, delete.`);
    }

    if (!isCrudMatrixMethod(method)) {
      throw new CliError(`Invalid CRUD route method "${method}". Allowed values: get, post, put, patch, delete.`);
    }

    if (!routePath || !routePath.startsWith("/")) {
      throw new CliError(`Invalid CRUD route path "${routePath}". Use a path starting with "/".`);
    }

    matrix[operation] = {
      method,
      path: routePath,
      auth: parseCrudRouteAuth(auth),
      zone: parseCrudRouteZone(zone),
      policy: parseCrudRoutePolicy(policy),
      bruno: parseCrudRouteBruno(bruno),
    };
  }

  return matrix;
}

function isCrudOperation(value: string | undefined): value is CrudOperation {
  return value === "list" || value === "get" || value === "create" || value === "update" || value === "delete";
}

function isCrudMatrixMethod(value: string | undefined): value is NonNullable<CrudRouteConfig["method"]> {
  return value === "get" || value === "post" || value === "put" || value === "patch" || value === "delete";
}

function parseCrudRouteAuth(value: string | undefined): CrudRouteConfig["auth"] {
  if (!value) return undefined;
  if (isCrudRouteAuthToken(value)) return value;
  throw new CliError(`Invalid CRUD route auth "${value}". Allowed values: none, jwt, api-key, local.`);
}

function parseCrudRouteZone(value: string | undefined): ApiZone | undefined {
  if (!value) return undefined;
  if (isCrudRouteZoneToken(value)) return value;
  throw new CliError(`Invalid CRUD route zone "${value}". Allowed values: public, private, admin.`);
}

function parseCrudRouteBruno(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  if (value === "bruno") return true;
  if (value === "no-bruno") return false;
  throw new CliError(`Invalid CRUD route Bruno option "${value}". Allowed values: bruno, no-bruno.`);
}

function isCrudRouteAuthToken(value: string | undefined): value is NonNullable<CrudRouteConfig["auth"]> {
  return value === "none" || value === "jwt" || value === "api-key" || value === "local";
}

function isCrudRouteZoneToken(value: string | undefined): value is ApiZone {
  return value === "public" || value === "private" || value === "admin";
}

function isCrudRouteBrunoToken(value: string | undefined): value is "bruno" | "no-bruno" {
  return value === "bruno" || value === "no-bruno";
}

function isCrudRoutePolicyToken(value: string | undefined): value is string {
  return value === "admin" || value === "none" || Boolean(value?.startsWith("roles=") || value?.startsWith("custom="));
}

function parseCrudRoutePolicy(value: string | undefined): AuthPolicy | undefined {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("roles=")) {
    return parseAuthPolicy(`roles:${value.slice("roles=".length)}`);
  }

  if (value.startsWith("custom=")) {
    return parseAuthPolicy(`custom:${value.slice("custom=".length)}`);
  }

  return parseAuthPolicy(value);
}

function resolveCrudSummaryPath(resourcePath: string, routePath: string): string {
  if (routePath === resourcePath || routePath.startsWith(`${resourcePath}/`)) {
    return routePath;
  }

  if (routePath === "/") {
    return resourcePath;
  }

  return `${resourcePath}${routePath.startsWith("/") ? routePath : `/${routePath}`}`;
}

function toControllerMethod(method: CrudRouteConfig["method"], fallback: RegularCrudAction["method"]): RegularCrudAction["method"] {
  if (!method) return fallback;
  const normalized = method[0].toUpperCase() + method.slice(1);
  return normalized as RegularCrudAction["method"];
}

function isSqlDatabase(value: "none" | DatabaseCapability): value is SqlDatabaseCapability {
  return value === "postgres" || value === "mysql" || value === "sqlite";
}

function formatDatabaseName(value: DatabaseCapability): string {
  if (value === "postgres") return "PostgreSQL";
  if (value === "mysql") return "MySQL";
  if (value === "sqlite") return "SQLite";
  if (value === "mongo") return "Mongo";
  return value;
}

function createRegularCrudRepositoryPortTs(names: ReturnType<typeof createNameVariants>): string {
  return `import { ${names.pascalName}, ${names.pascalName}Props } from '../../domain/${names.kebabName}.entity';

export const ${names.constantName}_REPOSITORY = '${names.pascalName}Repository';

export interface ${names.pascalName}Repository {
  list(): Promise<${names.pascalName}[]>;
  findById(id: string): Promise<${names.pascalName} | undefined>;
  create(input: Omit<${names.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'>): Promise<${names.pascalName}>;
  update(id: string, input: Partial<${names.pascalName}Props>): Promise<${names.pascalName} | undefined>;
  delete(id: string): Promise<boolean>;
}
`;
}

function createRegularCrudMemoryRepositoryTs(names: ReturnType<typeof createNameVariants>): string {
  return `import { randomUUID } from 'crypto';
import { ${names.pascalName}, ${names.pascalName}Props } from '../domain/${names.kebabName}.entity';
import { ${names.pascalName}Repository } from '../application/ports/${names.kebabName}-repository.port';

export class InMemory${names.pascalName}Repository implements ${names.pascalName}Repository {
  private readonly items = new Map<string, ${names.pascalName}>();

  async list(): Promise<${names.pascalName}[]> {
    return Array.from(this.items.values());
  }

  async findById(id: string): Promise<${names.pascalName} | undefined> {
    return this.items.get(id);
  }

  async create(input: Omit<${names.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'>): Promise<${names.pascalName}> {
    const now = new Date().toISOString();
    const item = new ${names.pascalName}({
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    this.items.set(item.id, item);
    return item;
  }

  async update(id: string, input: Partial<${names.pascalName}Props>): Promise<${names.pascalName} | undefined> {
    const current = this.items.get(id);
    if (!current) return undefined;

    const updated = new ${names.pascalName}({
      ...current.props,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    });
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
`;
}

function createRegularCrudMemoryRepositorySpecTs(
  names: ReturnType<typeof createNameVariants>,
  fields: ResourceFieldDefinition[] | undefined = []
): string {
  const input = createSampleInputObject(fields, "create", "  ");
  const updateInput = createSampleInputObject(fields, "update", "  ");
  const assertionField = normalizeResourceFields(fields)[0].name;
  const expectedUpdatedValue = createSampleFieldValue(normalizeResourceFields(fields)[0], "update");

  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { ${names.pascalName}Props } from '../domain/${names.kebabName}.entity';
import { InMemory${names.pascalName}Repository } from './${names.kebabName}.memory-repository';

test('InMemory${names.pascalName}Repository supports CRUD operations', async () => {
  const repository = new InMemory${names.pascalName}Repository();
  const input: Omit<${names.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'> = {
${input}
  };

  const created = await repository.create(input);
  assert.equal(Boolean(created.id), true);

  const listed = await repository.list();
  assert.equal(listed.length, 1);

  const found = await repository.findById(created.id);
  assert.equal(found?.id, created.id);

  const updated = await repository.update(created.id, {
${updateInput}
  });
  assert.equal(updated?.props.${assertionField}, ${expectedUpdatedValue});

  const deleted = await repository.delete(created.id);
  assert.equal(deleted, true);
  assert.equal(await repository.findById(created.id), undefined);
});
`;
}

function createRegularCrudMongoRepositoryTs(
  names: ReturnType<typeof createNameVariants>,
  fields: ResourceFieldDefinition[] | undefined = []
): string {
  const documentFields = createInterfaceFields(fields);

  return `import { randomUUID } from 'crypto';
import { MongoSource } from '@soapjs/soap-mongo';
import { Document } from 'mongodb';
import { ${names.pascalName}, ${names.pascalName}Props } from '../domain/${names.kebabName}.entity';
import { ${names.pascalName}Repository } from '../application/ports/${names.kebabName}-repository.port';

export interface ${names.pascalName}Document extends Document {
  id: string;
${documentFields}
  createdAt: string;
  updatedAt: string;
}

export class Mongo${names.pascalName}Repository implements ${names.pascalName}Repository {
  constructor(private readonly source: MongoSource<${names.pascalName}Document>) {}

  async list(): Promise<${names.pascalName}[]> {
    const documents = await this.source.find({});
    return documents.map((document) => new ${names.pascalName}(document));
  }

  async findById(id: string): Promise<${names.pascalName} | undefined> {
    const [document] = await this.source.find({ where: { id }, limit: 1 });
    return document ? new ${names.pascalName}(document) : undefined;
  }

  async create(input: Omit<${names.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'>): Promise<${names.pascalName}> {
    const now = new Date().toISOString();
    const document: ${names.pascalName}Document = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const [created] = await this.source.insert(document);
    return new ${names.pascalName}(created ?? document);
  }

  async update(id: string, input: Partial<${names.pascalName}Props>): Promise<${names.pascalName} | undefined> {
    const current = await this.findById(id);
    if (!current) return undefined;

    const next = {
      ...current.props,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    };
    await this.source.update({ where: { id }, update: next });
    return new ${names.pascalName}(next);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.source.remove({ where: { id } });
    return (result.deletedCount ?? 0) > 0;
  }
}
`;
}

function createRegularCrudSqlRepositoryTs(
  names: ReturnType<typeof createNameVariants>,
  db: SqlDatabaseCapability,
  fields: ResourceFieldDefinition[] | undefined = []
): string {
  const sql = createSqlFieldMetadata(fields, db);

  return `import { randomUUID } from 'crypto';
import { SqlDataSource } from '@soapjs/soap-sql';
import { ${names.pascalName}, ${names.pascalName}Props } from '../domain/${names.kebabName}.entity';
import { ${names.pascalName}Repository } from '../application/ports/${names.kebabName}-repository.port';

export interface ${names.pascalName}Row {
  id: string;
${sql.interfaceFields}
  createdAt: string;
  updatedAt: string;
}

export async function ensure${names.pascalName}Schema(source: SqlDataSource<${names.pascalName}Row>): Promise<void> {
  await source.query(\`
    CREATE TABLE IF NOT EXISTS ${names.snakeName} (
      id TEXT PRIMARY KEY,
${sql.columnDefinitions}
      ${sql.createdAtColumn} TEXT NOT NULL,
      ${quoteSqlIdentifier("updatedAt", db)} TEXT NOT NULL
    )
  \`);
}

export class Sql${names.pascalName}Repository implements ${names.pascalName}Repository {
  constructor(private readonly source: SqlDataSource<${names.pascalName}Row>) {}

  async list(): Promise<${names.pascalName}[]> {
    const result = await this.source.query('SELECT ${sql.selectColumns} FROM ${names.snakeName} ORDER BY ${sql.createdAtColumn} DESC');
    return result.data.map((row) => new ${names.pascalName}(row as ${names.pascalName}Row));
  }

  async findById(id: string): Promise<${names.pascalName} | undefined> {
    const result = await this.source.query('SELECT ${sql.selectColumns} FROM ${names.snakeName} WHERE id = ${sql.firstPlaceholder} LIMIT 1', [id]);
    const row = result.data[0] as ${names.pascalName}Row | undefined;
    return row ? new ${names.pascalName}(row) : undefined;
  }

  async create(input: Omit<${names.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'>): Promise<${names.pascalName}> {
    const now = new Date().toISOString();
    const row: ${names.pascalName}Row = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.source.query(
      'INSERT INTO ${names.snakeName} (${sql.insertColumns}) VALUES (${sql.insertPlaceholders})',
      [${sql.insertValues}]
    );
    return new ${names.pascalName}(row);
  }

  async update(id: string, input: Partial<${names.pascalName}Props>): Promise<${names.pascalName} | undefined> {
    const current = await this.findById(id);
    if (!current) return undefined;

    const next = {
      ...current.props,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    };
    const result = await this.source.query(
      'UPDATE ${names.snakeName} SET ${sql.updateAssignments} WHERE id = ${sql.idPlaceholder}',
      [${sql.updateValues}]
    );
    if (result.count === 0) return undefined;
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.source.query('DELETE FROM ${names.snakeName} WHERE id = ${sql.firstPlaceholder}', [id]);
    return result.count > 0;
  }
}
`;
}

function createRegularCrudUseCaseTs(
  action: RegularCrudAction,
  itemNames: ReturnType<typeof createNameVariants>
): string {
  const inputInterface = `${action.classBase}Input`;
  const outputInterface = `${action.classBase}Output`;
  const inputShape = createRegularCrudUseCaseInputShape(action);
  const outputShape = action.kind === "list"
    ? `export interface ${outputInterface} {
  items: ${itemNames.pascalName}Props[];
}
`
    : action.kind === "delete"
      ? `export interface ${outputInterface} {
  deleted: boolean;
}
`
      : `export type ${outputInterface} = ${itemNames.pascalName}Props | undefined;
`;
  const executeInput = action.kind === "list" ? "" : `input: ${inputInterface}`;
  const repositoryCall = createRegularCrudRepositoryCall(action.kind, itemNames);

  return `import { Injectable, Result, UseCase } from '@soapjs/soap';
import { ${itemNames.pascalName}Props } from '../../domain/${itemNames.kebabName}.entity';
import { ${itemNames.pascalName}Repository } from '../ports/${itemNames.kebabName}-repository.port';

${inputShape}
${outputShape}
@Injectable()
export class ${action.classBase}UseCase implements UseCase<${outputInterface}> {
  constructor(private readonly repository: ${itemNames.pascalName}Repository) {}

  async execute(${executeInput}): Promise<Result<${outputInterface}>> {
    try {
${repositoryCall}
    } catch (error) {
      return Result.withFailure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
`;
}

function createRegularCrudUseCaseSpecTs(
  action: RegularCrudAction,
  itemNames: ReturnType<typeof createNameVariants>,
  fields: ResourceFieldDefinition[] | undefined = []
): string {
  const props = createSamplePropsObject(fields, "create", "  ");
  const createInput = createSampleInputObject(fields, "create", "    ");
  const updateInput = createSampleInputObject(fields, "update", "    ");
  const execute = createRegularCrudUseCaseSpecExecute(action, createInput, updateInput);

  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { ${itemNames.pascalName}, ${itemNames.pascalName}Props } from '../../domain/${itemNames.kebabName}.entity';
import { ${itemNames.pascalName}Repository } from '../ports/${itemNames.kebabName}-repository.port';
import { ${action.classBase}UseCase } from './${action.name}.use-case';

test('${action.classBase}UseCase returns a successful Result', async () => {
  const props: ${itemNames.pascalName}Props = {
${props}
  };
  const repository: ${itemNames.pascalName}Repository = {
    async list() {
      return [new ${itemNames.pascalName}(props)];
    },
    async findById(id) {
      return id === props.id ? new ${itemNames.pascalName}(props) : undefined;
    },
    async create(input) {
      return new ${itemNames.pascalName}({
        ...props,
        ...input,
        id: 'created-id',
      });
    },
    async update(id, input) {
      return id === props.id
        ? new ${itemNames.pascalName}({
            ...props,
            ...input,
            id,
            updatedAt: '2026-01-02T00:00:00.000Z',
          })
        : undefined;
    },
    async delete(id) {
      return id === props.id;
    },
  };
  const useCase = new ${action.classBase}UseCase(repository);

${execute}
});
`;
}

function createRegularCrudUseCaseSpecExecute(action: RegularCrudAction, createInput: string, updateInput: string): string {
  if (action.kind === "list") {
    return `  const result = await useCase.execute();

  assert.equal(result.isSuccess(), true);
  assert.deepEqual(result.content, { items: [props] });`;
  }

  if (action.kind === "get") {
    return `  const result = await useCase.execute({ id: props.id });

  assert.equal(result.isSuccess(), true);
  assert.deepEqual(result.content, props);`;
  }

  if (action.kind === "create") {
    return `  const result = await useCase.execute({
${createInput}
  });

  assert.equal(result.isSuccess(), true);
  assert.equal(result.content?.id, 'created-id');`;
  }

  if (action.kind === "update") {
    return `  const result = await useCase.execute({
    id: props.id,
${updateInput}
  });

  assert.equal(result.isSuccess(), true);
  assert.equal(result.content?.id, props.id);`;
  }

  return `  const result = await useCase.execute({ id: props.id });

  assert.equal(result.isSuccess(), true);
  assert.deepEqual(result.content, { deleted: true });`;
}

function createRegularCrudUseCaseInputShape(action: RegularCrudAction): string {
  const kind = action.kind;

  if (kind === "list") {
    return "";
  }

  if (kind === "create") {
    return `export interface ${action.classBase}Input {
  [key: string]: unknown;
}
`;
  }

  if (kind === "update") {
    return `export interface ${action.classBase}Input {
  id: string;
  [key: string]: unknown;
}
`;
  }

  return `export interface ${action.classBase}Input {
  id: string;
}
`;
}

function createRegularCrudRepositoryCall(kind: RegularCrudAction["kind"], itemNames: ReturnType<typeof createNameVariants>): string {
  if (kind === "list") {
    return `      const items = await this.repository.list();
      return Result.withSuccess({ items: items.map((item) => item.props) });`;
  }

  if (kind === "get") {
    return `      const item = await this.repository.findById(input.id);
      return Result.withSuccess(item?.props);`;
  }

  if (kind === "create") {
    return `      const item = await this.repository.create(input as Omit<${itemNames.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'>);
      return Result.withSuccess(item.props);`;
  }

  if (kind === "update") {
    return `      const { id, ...changes } = input;
      const item = await this.repository.update(id, changes);
      return Result.withSuccess(item?.props);`;
  }

  return `      const deleted = await this.repository.delete(input.id);
      return Result.withSuccess({ deleted });`;
}

function createRegularCrudContractTs(action: RegularCrudAction, plan: AddResourcePlan): string {
  const source = action.kind === "list"
    ? "{ ...req.query }"
    : action.kind === "create"
      ? "{ ...req.body }"
      : action.kind === "update"
        ? "{ ...req.params, ...req.body }"
        : "{ ...req.params, ...req.query }";

  if (plan.contracts === "zod") {
    const schemaFields = createZodSchemaFields(plan.fields, action.kind);

    return `import { Request } from 'express';
import { z } from 'zod';

export const ${action.operationId}BodySchema = z.object({
${schemaFields}
}).passthrough();

export type ${action.classBase}RouteInput = z.infer<typeof ${action.operationId}BodySchema>;

export function ${action.operationId}BodyContract(req: Request): ${action.classBase}RouteInput {
  return ${action.operationId}BodySchema.parse(${source});
}
`;
  }

  return `import { Request } from 'express';

export interface ${action.classBase}RouteInput {
  [key: string]: unknown;
}

export function ${action.operationId}BodyContract(req: Request): ${action.classBase}RouteInput {
  return ${source};
}
`;
}

function createRegularCrudControllerTs(
  action: RegularCrudAction,
  itemNames: ReturnType<typeof createNameVariants>,
  featureNames: ReturnType<typeof createNameVariants>,
  plan: AddResourcePlan
): string {
  const routeAuth = action.auth ?? plan.auth;
  const routeZone = action.zone ?? plan.zone;
  const routePolicy = action.policy ?? plan.policy;
  const authDecorator = createAuthDecorator(routeAuth, routeZone, routePolicy);
  const authLine = authDecorator ? `  ${authDecorator}\n` : "";
  const decoratorImports = ["CallUseCase", "Controller", action.method, "RouteIO"];

  if (authDecorator?.startsWith("@Auth")) decoratorImports.push("Auth");
  if (authDecorator?.startsWith("@AdminOnly")) decoratorImports.push("AdminOnly");

  return `import { ${Array.from(new Set(decoratorImports)).sort().join(", ")} } from '@soapjs/soap-express';
import { ${action.classBase}UseCase } from '../application/use-cases/${action.name}.use-case';
import { ${action.operationId}BodyContract } from '../contracts/${action.name}.contract';

@Controller('/${featureNames.kebabName}', {
  apiDoc: {
    tags: ['${featureNames.pascalName}'],
    description: '${action.classBase} route generated by SoapJS CLI',
  },
})
export class ${action.classBase}Controller {
${authLine}  @CallUseCase(${action.classBase}UseCase)
  @RouteIO({ from: ${action.operationId}BodyContract })
  @${action.method}('${action.path}', ${createRouteApiDocOptions({
    summary: `${action.classBase} ${featureNames.kebabName}`,
    operationId: action.operationId,
    auth: routeAuth,
  })})
  async ${action.operationId}(): Promise<void> {}
}
`;
}

function createRegularCrudControllersIndexTs(
  featureNames: ReturnType<typeof createNameVariants>,
  actions: RegularCrudAction[]
): string {
  const imports = actions
    .map((action) => `import { ${action.classBase}Controller } from './${action.name}.controller';`)
    .join("\n");
  const controllers = actions.map((action) => `  ${action.classBase}Controller,`).join("\n");

  return `${imports}

export const ${featureNames.pascalName}Controllers = [
${controllers}
];
`;
}

function createRegularCrudSetupTs(
  featureNames: ReturnType<typeof createNameVariants>,
  itemNames: ReturnType<typeof createNameVariants>,
  actions: RegularCrudAction[],
  db: "none" | DatabaseCapability
): string {
  const repositoryImport = db === "mongo"
    ? `import { createMongoSource } from '../../common/data/mongo/mongo.source-factory';
import { ResourceContext } from '../../config/dependencies';
import { Mongo${itemNames.pascalName}Repository, ${itemNames.pascalName}Document } from './data/${itemNames.kebabName}.repository.mongo';`
    : isSqlDatabase(db)
      ? `import { createSqlSource } from '../../common/data/sql/sql.source-factory';
import { ResourceContext } from '../../config/dependencies';
import { ensure${itemNames.pascalName}Schema, Sql${itemNames.pascalName}Repository, ${itemNames.pascalName}Row } from './data/${itemNames.kebabName}.repository.sql';`
      : `import { ResourceContext } from '../../config/dependencies';
import { InMemory${itemNames.pascalName}Repository } from './data/${itemNames.kebabName}.memory-repository';`;
  const repositoryFactory = db === "mongo"
    ? `  if (!resources.mongo) {
    throw new Error('Mongo is not configured for ${featureNames.kebabName}. Enable --db mongo for the project.');
  }

  const source = createMongoSource<${itemNames.pascalName}Document>(resources.mongo, '${featureNames.kebabName}');
  const repository = new Mongo${itemNames.pascalName}Repository(source);`
    : isSqlDatabase(db)
      ? `  if (!resources.sql) {
    throw new Error('${formatDatabaseName(db)} is not configured for ${featureNames.kebabName}. Enable --db ${db} for the project.');
  }

  const sql = resources.sql.${db};
  if (!sql) {
    throw new Error('${formatDatabaseName(db)} is not configured for ${featureNames.kebabName}. Enable --db ${db} for the project.');
  }

  const source = createSqlSource<${itemNames.pascalName}Row>(sql, '${featureNames.snakeName}');
  await ensure${itemNames.pascalName}Schema(source);
  const repository = new Sql${itemNames.pascalName}Repository(source);`
      : `  const repository = new InMemory${itemNames.pascalName}Repository();`;
  const useCaseImports = actions
    .map((action) => `import { ${action.classBase}UseCase } from './application/use-cases/${action.name}.use-case';`)
    .join("\n");
  const useCaseBindings = actions
    .map((action) => `  container.bindFactory(${action.classBase}UseCase.name, () => new ${action.classBase}UseCase(repository));`)
    .join("\n");

  return `import { DIContainer } from '@soapjs/soap-express';
${repositoryImport}
import { ${itemNames.constantName}_REPOSITORY } from './application/ports/${itemNames.kebabName}-repository.port';
${useCaseImports}

export async function register${featureNames.pascalName}Dependencies(container: DIContainer, resources: ResourceContext): Promise<void> {
${repositoryFactory}

  container.bindValue(${itemNames.constantName}_REPOSITORY, repository);
${useCaseBindings}
}
`;
}

function createRegularCrudFeatureIndexTs(
  featureNames: ReturnType<typeof createNameVariants>,
  itemNames: ReturnType<typeof createNameVariants>
): string {
  return `export * from './api/${featureNames.kebabName}.controllers';
export * from './domain/${itemNames.kebabName}.entity';
export * from './application/ports/${itemNames.kebabName}-repository.port';
export * from './data/${itemNames.kebabName}.memory-repository';
export * from './setup';
`;
}

function createEntityTs(name: string, fields: ResourceFieldDefinition[] | undefined = []): string {
  const names = createNameVariants(name);
  const props = normalizeResourceFields(fields)
    .map((field) => `  ${field.name}${field.required ? "" : "?"}: ${toTypescriptType(field.type)};`)
    .join("\n");

  return `export interface ${names.pascalName}Props {
  id: string;
${props}
  createdAt: string;
  updatedAt: string;
}

export class ${names.pascalName} {
  constructor(public readonly props: ${names.pascalName}Props) {}

  get id(): string {
    return this.props.id;
  }
}
`;
}

function createEntitySpecTs(
  names: ReturnType<typeof createNameVariants>,
  fields: ResourceFieldDefinition[] | undefined = []
): string {
  const props = createSamplePropsObject(fields, "create", "  ");

  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { ${names.pascalName}, ${names.pascalName}Props } from './${names.kebabName}.entity';

test('${names.pascalName} exposes immutable props and id', () => {
  const props: ${names.pascalName}Props = {
${props}
  };
  const entity = new ${names.pascalName}(props);

  assert.equal(entity.id, props.id);
  assert.deepEqual(entity.props, props);
});
`;
}

export function parseResourceFieldDefinitions(values: string[] | undefined): ResourceFieldDefinition[] {
  return normalizeResourceFields((values ?? []).map(parseResourceFieldDefinition));
}

function parseResourceFieldDefinition(value: string): ResourceFieldDefinition {
  const [name, type, requiredToken] = value.split(":");

  if (!name || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    throw new CliError(`Invalid field definition "${value}". Use name:type or name:type:optional.`);
  }

  if (!isResourceFieldType(type)) {
    throw new CliError(`Invalid field type "${type}" for "${name}". Allowed values: string, number, boolean, date.`);
  }

  if (requiredToken && requiredToken !== "required" && requiredToken !== "optional") {
    throw new CliError(`Invalid field modifier "${requiredToken}" for "${name}". Use required or optional.`);
  }

  return {
    name,
    type,
    required: requiredToken !== "optional",
  };
}

function normalizeResourceFields(fields: ResourceFieldDefinition[] | undefined): ResourceFieldDefinition[] {
  const normalized = fields && fields.length > 0
    ? fields
    : [{ name: "name", type: "string", required: true } satisfies ResourceFieldDefinition];
  const byName = new Map<string, ResourceFieldDefinition>();

  for (const field of normalized) {
    byName.set(field.name, field);
  }

  return Array.from(byName.values());
}

function isResourceFieldType(value: string | undefined): value is ResourceFieldType {
  return value === "string" || value === "number" || value === "boolean" || value === "date";
}

function toTypescriptType(type: ResourceFieldType): string {
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  return "string";
}

function createInterfaceFields(fields: ResourceFieldDefinition[] | undefined): string {
  return normalizeResourceFields(fields)
    .map((field) => `  ${field.name}${field.required ? "" : "?"}: ${toTypescriptType(field.type)};`)
    .join("\n");
}

function createSamplePropsObject(
  fields: ResourceFieldDefinition[] | undefined,
  variant: "create" | "update",
  indent: string
): string {
  return [
    `${indent}id: 'entity-id',`,
    createSampleInputObject(fields, variant, indent),
    `${indent}createdAt: '2026-01-01T00:00:00.000Z',`,
    `${indent}updatedAt: '2026-01-01T00:00:00.000Z',`,
  ].join("\n");
}

function createSampleInputObject(
  fields: ResourceFieldDefinition[] | undefined,
  variant: "create" | "update",
  indent: string
): string {
  return normalizeResourceFields(fields)
    .map((field) => `${indent}${field.name}: ${createSampleFieldValue(field, variant)},`)
    .join("\n");
}

function createSampleFieldValue(field: ResourceFieldDefinition, variant: "create" | "update"): string {
  if (field.type === "number") {
    return variant === "create" ? "100" : "200";
  }

  if (field.type === "boolean") {
    return variant === "create" ? "true" : "false";
  }

  const prefix = variant === "create" ? "Sample" : "Updated";
  return JSON.stringify(`${prefix} ${field.name}`);
}

function createSqlFieldMetadata(fields: ResourceFieldDefinition[] | undefined, db: SqlDatabaseCapability): {
  interfaceFields: string;
  columnDefinitions: string;
  selectColumns: string;
  insertColumns: string;
  insertPlaceholders: string;
  insertValues: string;
  updateAssignments: string;
  updateValues: string;
  firstPlaceholder: string;
  idPlaceholder: string;
  createdAtColumn: string;
} {
  const normalized = normalizeResourceFields(fields);
  const quote = (value: string) => quoteSqlIdentifier(value, db);
  const placeholder = (index: number) => createSqlPlaceholder(index, db);
  const selectColumns = ["id", ...normalized.map((field) => quote(field.name)), quote("createdAt"), quote("updatedAt")];
  const insertColumns = ["id", ...normalized.map((field) => quote(field.name)), quote("createdAt"), quote("updatedAt")];
  const insertValues = ["row.id", ...normalized.map((field) => `row.${field.name}`), "row.createdAt", "row.updatedAt"];
  const updateAssignments = [
    ...normalized.map((field, index) => `${quote(field.name)} = ${placeholder(index + 2)}`),
    `${quote("updatedAt")} = ${placeholder(normalized.length + 2)}`,
  ];
  const updateValues = ["id", ...normalized.map((field) => `next.${field.name}`), "next.updatedAt"];

  return {
    interfaceFields: createInterfaceFields(normalized),
    columnDefinitions: normalized
      .map((field) => `      ${quote(field.name)} ${toSqlColumnType(field.type, db)}${field.required ? " NOT NULL" : ""},`)
      .join("\n"),
    selectColumns: selectColumns.join(", "),
    insertColumns: insertColumns.join(", "),
    insertPlaceholders: insertColumns.map((_, index) => placeholder(index + 1)).join(", "),
    insertValues: insertValues.join(", "),
    updateAssignments: updateAssignments.join(", "),
    updateValues: updateValues.join(", "),
    firstPlaceholder: placeholder(1),
    idPlaceholder: placeholder(1),
    createdAtColumn: quote("createdAt"),
  };
}

function quoteSqlIdentifier(value: string, db: SqlDatabaseCapability): string {
  if (/^[a-z_][a-z0-9_]*$/.test(value)) {
    return value;
  }

  return db === "mysql" ? `\`${value}\`` : `"${value}"`;
}

function createSqlPlaceholder(index: number, db: SqlDatabaseCapability): string {
  return db === "postgres" ? `$${index}` : "?";
}

function toSqlColumnType(type: ResourceFieldType, db: SqlDatabaseCapability): string {
  if (type === "number") return db === "postgres" ? "DOUBLE PRECISION" : "REAL";
  if (type === "boolean") return "BOOLEAN";
  return "TEXT";
}

function createZodSchemaFields(fields: ResourceFieldDefinition[] | undefined, kind: RegularCrudAction["kind"]): string {
  const resourceFields = kind === "create" || kind === "update"
    ? normalizeResourceFields(fields).map((field) => ({
        ...field,
        required: kind === "create" ? field.required : false,
      }))
    : [];
  const idFields = kind === "get" || kind === "update" || kind === "delete"
    ? [{ name: "id", type: "string", required: true } satisfies ResourceFieldDefinition]
    : [];
  const allFields = [...idFields, ...resourceFields];

  return allFields
    .map((field) => `  ${field.name}: ${toZodExpression(field)},`)
    .join("\n");
}

function toZodExpression(field: ResourceFieldDefinition): string {
  const base = field.type === "number"
    ? "z.coerce.number()"
    : field.type === "boolean"
      ? "z.coerce.boolean()"
      : "z.string()";

  return field.required ? base : `${base}.optional()`;
}

function createRepositoryPortTs(name: string): string {
  const names = createNameVariants(name);

  return `import { ${names.pascalName}, ${names.pascalName}Props } from '../../domain/${names.kebabName}.entity';

export interface ${names.pascalName}Repository {
  list(): Promise<${names.pascalName}[]>;
  findById(id: string): Promise<${names.pascalName} | undefined>;
  create(input: Omit<${names.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'>): Promise<${names.pascalName}>;
  update(id: string, input: Partial<${names.pascalName}Props>): Promise<${names.pascalName} | undefined>;
  delete(id: string): Promise<boolean>;
}
`;
}

function createMemoryRepositoryTs(name: string): string {
  const names = createNameVariants(name);

  return `import { randomUUID } from 'crypto';
import { ${names.pascalName}, ${names.pascalName}Props } from '../domain/${names.kebabName}.entity';
import { ${names.pascalName}Repository } from '../application/ports/${names.kebabName}.repository';

export class InMemory${names.pascalName}Repository implements ${names.pascalName}Repository {
  private readonly items = new Map<string, ${names.pascalName}>();

  async list(): Promise<${names.pascalName}[]> {
    return Array.from(this.items.values());
  }

  async findById(id: string): Promise<${names.pascalName} | undefined> {
    return this.items.get(id);
  }

  async create(input: Omit<${names.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'>): Promise<${names.pascalName}> {
    const now = new Date().toISOString();
    const item = new ${names.pascalName}({
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    this.items.set(item.id, item);
    return item;
  }

  async update(id: string, input: Partial<${names.pascalName}Props>): Promise<${names.pascalName} | undefined> {
    const current = this.items.get(id);
    if (!current) return undefined;

    const updated = new ${names.pascalName}({
      ...current.props,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    });
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
`;
}

function createUseCasesTs(name: string): string {
  const names = createNameVariants(name);

  return `import { ${names.pascalName}Repository } from '../ports/${names.kebabName}.repository';

export class List${names.pascalName}UseCase {
  constructor(private readonly repository: ${names.pascalName}Repository) {}

  execute() {
    return this.repository.list();
  }
}

export class Get${names.pascalName}UseCase {
  constructor(private readonly repository: ${names.pascalName}Repository) {}

  execute(id: string) {
    return this.repository.findById(id);
  }
}

export class Create${names.pascalName}UseCase {
  constructor(private readonly repository: ${names.pascalName}Repository) {}

  execute(input: { name: string }) {
    return this.repository.create(input);
  }
}

export class Update${names.pascalName}UseCase {
  constructor(private readonly repository: ${names.pascalName}Repository) {}

  execute(id: string, input: { name?: string }) {
    return this.repository.update(id, input);
  }
}

export class Delete${names.pascalName}UseCase {
  constructor(private readonly repository: ${names.pascalName}Repository) {}

  execute(id: string) {
    return this.repository.delete(id);
  }
}
`;
}

function createMongoRepositoryTs(name: string, fields: ResourceFieldDefinition[] | undefined = []): string {
  const names = createNameVariants(name);
  const documentFields = createInterfaceFields(fields);

  return `import { randomUUID } from 'crypto';
import { MongoSource } from '@soapjs/soap-mongo';
import { Document } from 'mongodb';
import { ${names.pascalName}, ${names.pascalName}Props } from '../domain/${names.kebabName}.entity';
import { ${names.pascalName}Repository } from '../application/ports/${names.kebabName}.repository';

export interface ${names.pascalName}Document extends Document {
  id: string;
${documentFields}
  createdAt: string;
  updatedAt: string;
}

export class Mongo${names.pascalName}Repository implements ${names.pascalName}Repository {
  constructor(private readonly source: MongoSource<${names.pascalName}Document>) {}

  async list(): Promise<${names.pascalName}[]> {
    const documents = await this.source.find({});
    return documents.map((document) => new ${names.pascalName}(document));
  }

  async findById(id: string): Promise<${names.pascalName} | undefined> {
    const [document] = await this.source.find({ where: { id }, limit: 1 });
    return document ? new ${names.pascalName}(document) : undefined;
  }

  async create(input: Omit<${names.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'>): Promise<${names.pascalName}> {
    const now = new Date().toISOString();
    const document: ${names.pascalName}Document = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const [created] = await this.source.insert(document);
    return new ${names.pascalName}(created ?? document);
  }

  async update(id: string, input: Partial<${names.pascalName}Props>): Promise<${names.pascalName} | undefined> {
    const current = await this.findById(id);
    if (!current) return undefined;

    const next = {
      ...current.props,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    };
    await this.source.update({ where: { id }, update: next });
    return new ${names.pascalName}(next);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.source.remove({ where: { id } });
    return (result.deletedCount ?? 0) > 0;
  }
}
`;
}

function createSqlRepositoryTs(name: string, db: SqlDatabaseCapability, fields: ResourceFieldDefinition[] | undefined = []): string {
  const names = createNameVariants(name);
  const sql = createSqlFieldMetadata(fields, db);

  return `import { randomUUID } from 'crypto';
import { SqlDataSource } from '@soapjs/soap-sql';
import { ${names.pascalName}, ${names.pascalName}Props } from '../domain/${names.kebabName}.entity';
import { ${names.pascalName}Repository } from '../application/ports/${names.kebabName}.repository';

export interface ${names.pascalName}Row {
  id: string;
${sql.interfaceFields}
  createdAt: string;
  updatedAt: string;
}

export async function ensure${names.pascalName}Schema(source: SqlDataSource<${names.pascalName}Row>): Promise<void> {
  await source.query(\`
    CREATE TABLE IF NOT EXISTS ${names.snakeName} (
      id TEXT PRIMARY KEY,
${sql.columnDefinitions}
      ${sql.createdAtColumn} TEXT NOT NULL,
      ${quoteSqlIdentifier("updatedAt", db)} TEXT NOT NULL
    )
  \`);
}

export class Sql${names.pascalName}Repository implements ${names.pascalName}Repository {
  constructor(private readonly source: SqlDataSource<${names.pascalName}Row>) {}

  async list(): Promise<${names.pascalName}[]> {
    const result = await this.source.query('SELECT ${sql.selectColumns} FROM ${names.snakeName} ORDER BY ${sql.createdAtColumn} DESC');
    return result.data.map((row) => new ${names.pascalName}(row as ${names.pascalName}Row));
  }

  async findById(id: string): Promise<${names.pascalName} | undefined> {
    const result = await this.source.query('SELECT ${sql.selectColumns} FROM ${names.snakeName} WHERE id = ${sql.firstPlaceholder} LIMIT 1', [id]);
    const row = result.data[0] as ${names.pascalName}Row | undefined;
    return row ? new ${names.pascalName}(row) : undefined;
  }

  async create(input: Omit<${names.pascalName}Props, 'id' | 'createdAt' | 'updatedAt'>): Promise<${names.pascalName}> {
    const now = new Date().toISOString();
    const row: ${names.pascalName}Row = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.source.query(
      'INSERT INTO ${names.snakeName} (${sql.insertColumns}) VALUES (${sql.insertPlaceholders})',
      [${sql.insertValues}]
    );
    return new ${names.pascalName}(row);
  }

  async update(id: string, input: Partial<${names.pascalName}Props>): Promise<${names.pascalName} | undefined> {
    const current = await this.findById(id);
    if (!current) return undefined;

    const next = {
      ...current.props,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    };
    const result = await this.source.query(
      'UPDATE ${names.snakeName} SET ${sql.updateAssignments} WHERE id = ${sql.idPlaceholder}',
      [${sql.updateValues}]
    );
    if (result.count === 0) return undefined;
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.source.query('DELETE FROM ${names.snakeName} WHERE id = ${sql.firstPlaceholder}', [id]);
    return result.count > 0;
  }
}
`;
}

function createSetupTs(name: string, db: "none" | DatabaseCapability): string {
  const names = createNameVariants(name);
  const repositoryImport = db === "mongo"
    ? `import { createMongoSource } from '../../common/data/mongo/mongo.source-factory';
import { ResourceContext } from '../../config/dependencies';
import { Mongo${names.pascalName}Repository, ${names.pascalName}Document } from './data/${names.kebabName}.mongo-repository';`
    : isSqlDatabase(db)
      ? `import { createSqlSource } from '../../common/data/sql/sql.source-factory';
import { ResourceContext } from '../../config/dependencies';
import { ensure${names.pascalName}Schema, Sql${names.pascalName}Repository, ${names.pascalName}Row } from './data/${names.kebabName}.sql-repository';`
    : `import { ResourceContext } from '../../config/dependencies';
import { InMemory${names.pascalName}Repository } from './data/${names.kebabName}.memory-repository';`;
  const repositoryFactory = db === "mongo"
    ? `  if (!resources.mongo) {
    throw new Error('Mongo is not configured for ${names.kebabName}. Enable --db mongo for the project.');
  }

  const source = createMongoSource<${names.pascalName}Document>(resources.mongo, '${names.kebabName}');
  const repository = new Mongo${names.pascalName}Repository(source);`
    : isSqlDatabase(db)
      ? `  if (!resources.sql) {
    throw new Error('${formatDatabaseName(db)} is not configured for ${names.kebabName}. Enable --db ${db} for the project.');
  }

  const sql = resources.sql.${db};
  if (!sql) {
    throw new Error('${formatDatabaseName(db)} is not configured for ${names.kebabName}. Enable --db ${db} for the project.');
  }

  const source = createSqlSource<${names.pascalName}Row>(sql, '${names.snakeName}');
  await ensure${names.pascalName}Schema(source);
  const repository = new Sql${names.pascalName}Repository(source);`
    : `  const repository = new InMemory${names.pascalName}Repository();`;

  return `import { DIContainer } from '@soapjs/soap-express';
${repositoryImport}
import {
  Create${names.pascalName}UseCase,
  Delete${names.pascalName}UseCase,
  Get${names.pascalName}UseCase,
  List${names.pascalName}UseCase,
  Update${names.pascalName}UseCase,
} from './application/use-cases/${names.kebabName}.use-cases';

export const ${names.constantName}_REPOSITORY = '${names.pascalName}Repository';

export async function register${names.pascalName}Dependencies(container: DIContainer, resources: ResourceContext): Promise<void> {
${repositoryFactory}

  container.bindValue(${names.constantName}_REPOSITORY, repository);
  container.bindFactory(List${names.pascalName}UseCase.name, () => new List${names.pascalName}UseCase(repository));
  container.bindFactory(Get${names.pascalName}UseCase.name, () => new Get${names.pascalName}UseCase(repository));
  container.bindFactory(Create${names.pascalName}UseCase.name, () => new Create${names.pascalName}UseCase(repository));
  container.bindFactory(Update${names.pascalName}UseCase.name, () => new Update${names.pascalName}UseCase(repository));
  container.bindFactory(Delete${names.pascalName}UseCase.name, () => new Delete${names.pascalName}UseCase(repository));
}
`;
}

function createControllerTs(plan: AddResourcePlan): string {
  const names = createNameVariants(plan.name);
  const routeBase = `/${names.pluralName}`;
  const authDecorator = createAuthDecorator(plan.auth, plan.zone, plan.policy);
  const authLine = authDecorator ? `\n  ${authDecorator}` : "";
  const crudMethods = plan.crud
    ? `
${authLine}
  @Post('/', ${createRouteApiDocOptions({
    summary: `Create ${names.pascalName}`,
    operationId: `create${names.pascalName}`,
    auth: plan.auth,
  })})
  async create(req: Request): Promise<unknown> {
    return this.create${names.pascalName}.execute(req.body);
  }

${authLine}
  @Put('/:id', ${createRouteApiDocOptions({
    summary: `Update ${names.pascalName}`,
    operationId: `update${names.pascalName}`,
    auth: plan.auth,
  })})
  async update(req: Request): Promise<unknown> {
    return this.update${names.pascalName}.execute(req.params.id, req.body);
  }

${authLine}
  @Delete('/:id', ${createRouteApiDocOptions({
    summary: `Delete ${names.pascalName}`,
    operationId: `delete${names.pascalName}`,
    auth: plan.auth,
  })})
  async delete(req: Request): Promise<unknown> {
    return this.delete${names.pascalName}.execute(req.params.id);
  }
`
    : "";

  return `import { Request } from 'express';
import { AdminOnly, Auth, Controller, Delete, Get, Post, Put } from '@soapjs/soap-express';
import {
  Create${names.pascalName}UseCase,
  Delete${names.pascalName}UseCase,
  Get${names.pascalName}UseCase,
  List${names.pascalName}UseCase,
  Update${names.pascalName}UseCase,
} from '../application/use-cases/${names.kebabName}.use-cases';

@Controller('${routeBase}', {
  apiDoc: {
    tags: ['${names.pascalName}'],
    description: '${names.pascalName} resource generated by SoapJS CLI',
  },
})
export class ${names.pascalName}Controller {
  constructor(
    private readonly list${names.pascalName}: List${names.pascalName}UseCase,
    private readonly get${names.pascalName}: Get${names.pascalName}UseCase,
    private readonly create${names.pascalName}: Create${names.pascalName}UseCase,
    private readonly update${names.pascalName}: Update${names.pascalName}UseCase,
    private readonly delete${names.pascalName}: Delete${names.pascalName}UseCase,
  ) {}${authLine}
  @Get('/', ${createRouteApiDocOptions({
    summary: `List ${names.pascalName}`,
    operationId: `list${names.pascalName}`,
    auth: plan.auth,
  })})
  async list(): Promise<unknown> {
    return this.list${names.pascalName}.execute();
  }

${authLine}
  @Get('/:id', ${createRouteApiDocOptions({
    summary: `Get ${names.pascalName}`,
    operationId: `get${names.pascalName}`,
    auth: plan.auth,
  })})
  async get(req: Request): Promise<unknown> {
    return this.get${names.pascalName}.execute(req.params.id);
  }
${crudMethods}}
`;
}

export function createAuthDecorator(auth: "none" | AuthCapability, zone: ApiZone, policy?: AuthPolicy): string | undefined {
  if (auth === "none") {
    return undefined;
  }

  const strategy = auth === "local" ? "jwt" : auth;

  if (zone === "admin" || policy?.type === "admin") {
    return `@AdminOnly('${strategy}')`;
  }

  const policyArgument = createAuthPolicyArgument(policy);

  return policyArgument ? `@Auth('${strategy}', ${policyArgument})` : `@Auth('${strategy}')`;
}

export function createRouteApiDocOptions(input: {
  summary: string;
  operationId: string;
  auth: "none" | AuthCapability;
}): string {
  const security = input.auth === "none"
    ? ""
    : `,\n      security: [{ name: '${input.auth === "local" ? "jwt" : input.auth}' }]`;

  return `{
    apiDoc: {
      summary: '${input.summary}',
      operationId: '${input.operationId}',
      responses: {
        '200': { description: 'Success' },
      }${security},
    },
  }`;
}

function createFeatureIndexTs(name: string): string {
  const names = createNameVariants(name);

  return `export * from './api/${names.kebabName}.controller';
export * from './domain/${names.kebabName}.entity';
export * from './application/ports/${names.kebabName}.repository';
export * from './application/use-cases/${names.kebabName}.use-cases';
export * from './data/${names.kebabName}.memory-repository';
export * from './setup';
`;
}
