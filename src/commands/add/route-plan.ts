import path from "path";
import { ApiZone, Architecture, AuthCapability, AuthPolicy, ResourceRegistryEntry, RouteRegistryEntry } from "../../config/schemas/types";
import { CliError } from "../../core/errors";
import { PlannedFile } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";
import { createRouteApiDocOptions } from "./resource-plan";
import { createAuthPolicyArgument } from "../../config/auth-policy";

export type RouteMethod = "get" | "post" | "put" | "patch" | "delete" | "head" | "options";

export interface AddRoutePlan {
  resource: ResourceRegistryEntry;
  name: string;
  method: RouteMethod;
  path?: string;
  useCase?: string;
  command?: string;
  query?: string;
  auth: "none" | AuthCapability;
  zone: ApiZone;
  policy?: AuthPolicy;
  featuresRoot: string;
  contracts?: "plain" | "zod";
}

export interface FeatureRouteControllerPlan {
  resource: ResourceRegistryEntry;
  routes: RouteRegistryEntry[];
  featuresRoot: string;
  architecture: Architecture;
}

const decoratorByMethod: Record<RouteMethod, string> = {
  get: "Get",
  post: "Post",
  put: "Put",
  patch: "Patch",
  delete: "Delete",
  head: "Head",
  options: "Options",
};

export const routeMethods: RouteMethod[] = ["get", "post", "put", "patch", "delete", "head", "options"];

export function createRouteEntry(plan: AddRoutePlan): RouteRegistryEntry {
  const names = createNameVariants(plan.name);
  const absolutePath = resolveRoutePath(plan.resource.path, names.kebabName, plan.path);

  return {
    resource: plan.resource.name,
    name: names.kebabName,
    method: plan.method.toUpperCase(),
    path: absolutePath,
    useCase: plan.useCase,
    command: plan.command,
    query: plan.query,
    auth: plan.auth,
    zone: plan.zone,
    policy: plan.policy,
    generatedAt: new Date().toISOString(),
  };
}

export function createFeatureRouteControllerFile(plan: FeatureRouteControllerPlan): PlannedFile {
  const resourceNames = createNameVariants(plan.resource.name);

  return {
    path: path.posix.join(plan.featuresRoot, resourceNames.kebabName, "api", `${resourceNames.kebabName}.controller.ts`),
    type: "route",
    owner: resourceNames.kebabName,
    content: createFeatureRouteControllerTs(plan),
  };
}

export function createRouteControllerFile(plan: AddRoutePlan): PlannedFile {
  const resourceNames = createNameVariants(plan.resource.name);
  const routeNames = createNameVariants(plan.name);
  const controllerPath = path.posix.join(
    plan.featuresRoot,
    resourceNames.kebabName,
    "api",
    `${routeNames.kebabName}.controller.ts`
  );

  return {
    path: controllerPath,
    type: "route",
    owner: resourceNames.kebabName,
    content: createRouteControllerTs(plan),
  };
}

export function createRouteControllersIndexFile(
  resource: ResourceRegistryEntry,
  featuresRoot: string,
  routeNames: string[]
): PlannedFile {
  const resourceNames = createNameVariants(resource.name);
  const uniqueRouteNames = Array.from(new Set(routeNames)).sort();
  const imports = uniqueRouteNames
    .map((routeName) => {
      const names = createNameVariants(routeName);
      return `import { ${names.pascalName}Controller } from './${names.kebabName}.controller';`;
    })
    .join("\n");
  const controllers = uniqueRouteNames
    .map((routeName) => `  ${createNameVariants(routeName).pascalName}Controller,`)
    .join("\n");

  return {
    path: path.posix.join(planFeatureRoot(featuresRoot, resourceNames.kebabName), "api", `${resourceNames.kebabName}.controllers.ts`),
    type: "config",
    owner: resourceNames.kebabName,
    content: `${imports}

export const ${resourceNames.pascalName}Controllers = [
${controllers}
];
`,
  };
}

export function createRouteContractFile(plan: AddRoutePlan): PlannedFile {
  const resourceNames = createNameVariants(plan.resource.name);
  const routeNames = createNameVariants(plan.name);
  const contractPath = path.posix.join(
    plan.featuresRoot,
    resourceNames.kebabName,
    "contracts",
    `${routeNames.kebabName}.contract.ts`
  );

  return {
    path: contractPath,
    type: "route",
    owner: resourceNames.kebabName,
    content: createRouteContractTs(routeNames.pascalName, routeNames.camelName, plan.method, plan.contracts),
  };
}

export function createRouteContractSpecFile(plan: AddRoutePlan): PlannedFile {
  const resourceNames = createNameVariants(plan.resource.name);
  const routeNames = createNameVariants(plan.name);
  const contractPath = path.posix.join(
    plan.featuresRoot,
    resourceNames.kebabName,
    "contracts",
    `${routeNames.kebabName}.contract.spec.ts`
  );

  return {
    path: contractPath,
    type: "route",
    owner: resourceNames.kebabName,
    content: createRouteContractSpecTs(routeNames.kebabName, routeNames.camelName, plan.method),
  };
}

export function routeControllerNameFromPath(filePath: string): string | undefined {
  const match = filePath.match(/\/api\/([^/]+)\.controller\.ts$/);
  const name = match?.[1];

  if (!name || name.endsWith(".controllers")) {
    return undefined;
  }

  return name;
}

export function routeControllerIndexResourceFromPath(filePath: string, featuresRoot: string): string | undefined {
  const escapedRoot = featuresRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = filePath.match(new RegExp(`^${escapedRoot}/([^/]+)/api/\\1\\.controllers\\.ts$`));
  return match?.[1];
}

function createRouteControllerTs(plan: AddRoutePlan): string {
  const resourceNames = createNameVariants(plan.resource.name);
  const routeNames = createNameVariants(plan.name);
  const useCaseNames = plan.useCase ? createNameVariants(plan.useCase) : undefined;
  const commandNames = plan.command ? createNameVariants(plan.command) : undefined;
  const queryNames = plan.query ? createNameVariants(plan.query) : undefined;
  const cqrsTarget = commandNames
    ? {
        kind: "command" as const,
        names: commandNames,
        className: `${commandNames.pascalName}Command`,
        busType: "CommandBus",
        busProperty: "commandBus",
        importPath: `../application/commands/${commandNames.kebabName}.command`,
      }
    : queryNames
      ? {
          kind: "query" as const,
          names: queryNames,
          className: `${queryNames.pascalName}Query`,
          busType: "QueryBus",
          busProperty: "queryBus",
          importPath: `../application/queries/${queryNames.kebabName}.query`,
        }
      : undefined;
  const decorator = decoratorByMethod[plan.method];
  const routePath = toControllerRoutePath(plan.resource.path, resolveRoutePath(plan.resource.path, routeNames.kebabName, plan.path));
  const soapImports = createSoapExpressImports(plan, decorator);
  const expressImport = cqrsTarget ? "import { Request } from 'express';\n" : "";
  const cqrsImport = cqrsTarget ? `import { ${cqrsTarget.busType} } from '@soapjs/soap/cqrs';\n` : "";
  const cqrsTargetImport = cqrsTarget ? `import { ${cqrsTarget.className} } from '${cqrsTarget.importPath}';\n` : "";
  const useCaseImport = useCaseNames
    ? `import { ${useCaseNames.pascalName}UseCase } from '../application/use-cases/${useCaseNames.kebabName}.use-case';\n`
    : "";
  const contractImport = useCaseNames || cqrsTarget
    ? `import { ${routeNames.camelName}BodyContract } from '../contracts/${routeNames.kebabName}.contract';\n`
    : "";
  const authDecorator = createRouteAuthDecorator(plan.auth, plan.zone, plan.policy);
  const authLine = authDecorator ? `  ${authDecorator}\n` : "";
  const useCaseDecorators = useCaseNames
    ? `  @CallUseCase(${useCaseNames.pascalName}UseCase)\n  @RouteIO({ from: ${routeNames.camelName}BodyContract })\n`
    : "";
  const constructor = cqrsTarget
    ? `  constructor(@Inject('${cqrsTarget.busType}') private readonly ${cqrsTarget.busProperty}: ${cqrsTarget.busType}) {}\n\n`
    : "";
  const methodArgs = cqrsTarget ? "req: Request" : "";
  const body = cqrsTarget
    ? `\n    return this.${cqrsTarget.busProperty}.dispatch(new ${cqrsTarget.className}(${routeNames.camelName}BodyContract(req)));\n  `
    : useCaseNames
    ? ""
    : `\n    return { resource: '${resourceNames.kebabName}', action: '${routeNames.kebabName}' };\n  `;
  const returnType = useCaseNames ? "void" : "unknown";

  return `${expressImport}${soapImports}
${cqrsImport}${cqrsTargetImport}${useCaseImport}${contractImport}
@Controller('${plan.resource.path}', {
  apiDoc: {
    tags: ['${resourceNames.pascalName}'],
    description: '${routeNames.pascalName} route generated by SoapJS CLI',
  },
})
export class ${routeNames.pascalName}Controller {
${constructor}${authLine}${useCaseDecorators}  @${decorator}('${routePath}', ${createRouteApiDocOptions({
    summary: `${routeNames.camelName} ${resourceNames.kebabName}`,
    operationId: routeNames.camelName,
    auth: plan.auth,
  })})
  async ${routeNames.camelName}(${methodArgs}): Promise<${returnType}> {${body}}
}
`;
}

function createFeatureRouteControllerTs(plan: FeatureRouteControllerPlan): string {
  const resourceNames = createNameVariants(plan.resource.name);
  const sortedRoutes = [...plan.routes].sort((left, right) => {
    const order = ["list", "get", "create", "update", "delete"];
    const leftIndex = order.indexOf(left.name);
    const rightIndex = order.indexOf(right.name);

    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
    }

    return left.name.localeCompare(right.name);
  });
  const routeModels = sortedRoutes.map((route) => createFeatureRouteModel(plan, route));
  const soapImports = new Set<string>(["Controller"]);
  const useCaseImports = new Map<string, string>();
  const commandImports = new Map<string, string>();
  const queryImports = new Map<string, string>();
  const contractImports = new Map<string, string>();
  let needsRequest = false;
  let needsCommandBus = false;
  let needsQueryBus = false;

  for (const model of routeModels) {
    soapImports.add(model.decorator);

    if (model.authDecorator?.startsWith("@Public")) soapImports.add("Public");
    if (model.authDecorator?.startsWith("@Auth")) soapImports.add("Auth");
    if (model.authDecorator?.startsWith("@AdminOnly")) soapImports.add("AdminOnly");

    if (model.useCase) {
      soapImports.add("CallUseCase");
      soapImports.add("RouteIO");
      useCaseImports.set(model.useCase.className, model.useCase.importPath);
      contractImports.set(model.contract.functionName, model.contract.importPath);
    }

    if (model.command) {
      soapImports.add("Inject");
      needsRequest = true;
      needsCommandBus = true;
      commandImports.set(model.command.className, model.command.importPath);
      contractImports.set(model.contract.functionName, model.contract.importPath);
    }

    if (model.query) {
      soapImports.add("Inject");
      needsRequest = true;
      needsQueryBus = true;
      queryImports.set(model.query.className, model.query.importPath);
      contractImports.set(model.contract.functionName, model.contract.importPath);
    }
  }

  const expressImport = needsRequest ? "import { Request } from 'express';\n" : "";
  const soapImport = `import { ${Array.from(soapImports).sort().join(", ")} } from '@soapjs/soap-express';`;
  const cqrsImports = [
    needsCommandBus ? "CommandBus" : undefined,
    needsQueryBus ? "QueryBus" : undefined,
  ].filter(Boolean);
  const cqrsImport = cqrsImports.length > 0 ? `\nimport { ${cqrsImports.join(", ")} } from '@soapjs/soap/cqrs';` : "";
  const importLines = [
    ...Array.from(useCaseImports.entries()).map(([className, importPath]) => `import { ${className} } from '${importPath}';`),
    ...Array.from(commandImports.entries()).map(([className, importPath]) => `import { ${className} } from '${importPath}';`),
    ...Array.from(queryImports.entries()).map(([className, importPath]) => `import { ${className} } from '${importPath}';`),
    ...Array.from(contractImports.entries()).map(([functionName, importPath]) => `import { ${functionName} } from '${importPath}';`),
  ].sort();
  const constructorArgs = [
    needsCommandBus ? "    @Inject('CommandBus') private readonly commandBus: CommandBus," : undefined,
    needsQueryBus ? "    @Inject('QueryBus') private readonly queryBus: QueryBus," : undefined,
  ].filter(Boolean);
  const constructor = constructorArgs.length > 0
    ? `
  constructor(
${constructorArgs.join("\n")}
  ) {}
`
    : "";
  const methods = routeModels.map(createFeatureRouteMethodTs).join("\n\n");

  return `${expressImport}${soapImport}${cqrsImport}
${importLines.length > 0 ? `${importLines.join("\n")}\n` : ""}
@Controller('${plan.resource.path}', {
  apiDoc: {
    tags: ['${resourceNames.pascalName}'],
    description: '${resourceNames.pascalName} routes generated by SoapJS CLI',
  },
})
export class ${resourceNames.pascalName}Controller {${constructor}
${methods}
}
`;
}

interface FeatureRouteModel {
  decorator: string;
  routePath: string;
  methodName: string;
  operationId: string;
  summary: string;
  auth: "none" | AuthCapability;
  authDecorator?: string;
  useCase?: {
    className: string;
    importPath: string;
  };
  command?: {
    className: string;
    importPath: string;
  };
  query?: {
    className: string;
    importPath: string;
  };
  contract: {
    functionName: string;
    importPath: string;
  };
}

function createFeatureRouteModel(plan: FeatureRouteControllerPlan, route: RouteRegistryEntry): FeatureRouteModel {
  const resourceNames = createNameVariants(plan.resource.name);
  const routeNames = createNameVariants(route.name);
  const crudAction = plan.resource.crud ? createCrudActionModel(route.name, resourceNames) : undefined;
  const method = route.method.toLowerCase() as RouteMethod;
  const decorator = decoratorByMethod[method] ?? "Get";
  const routePath = toControllerRoutePath(plan.resource.path, route.path);
  const authDecorator = createRouteAuthDecorator(route.auth, route.zone, route.policy);
  const contractName = crudAction?.operationId ?? routeNames.camelName;
  const contractFile = crudAction?.fileName ?? routeNames.kebabName;
  const base: FeatureRouteModel = {
    decorator,
    routePath,
    methodName: crudAction?.operationId ?? routeNames.camelName,
    operationId: crudAction?.operationId ?? routeNames.camelName,
    summary: crudAction ? `${crudAction.classBase} ${resourceNames.kebabName}` : `${routeNames.camelName} ${resourceNames.kebabName}`,
    auth: route.auth,
    authDecorator,
    contract: {
      functionName: `${contractName}BodyContract`,
      importPath: `../contracts/${contractFile}.contract`,
    },
  };

  if (plan.architecture === "regular") {
    const useCaseName = route.useCase ? createNameVariants(route.useCase) : undefined;
    const useCaseClass = useCaseName ? `${useCaseName.pascalName}UseCase` : crudAction ? `${crudAction.classBase}UseCase` : undefined;
    const useCaseFile = useCaseName?.kebabName ?? crudAction?.fileName;

    return useCaseClass && useCaseFile
      ? {
          ...base,
          useCase: {
            className: useCaseClass,
            importPath: `../application/use-cases/${useCaseFile}.use-case`,
          },
        }
      : base;
  }

  const commandName = route.command ? createNameVariants(route.command) : undefined;
  const queryName = route.query ? createNameVariants(route.query) : undefined;
  const cqrs = commandName
    ? {
        kind: "command" as const,
        className: `${commandName.pascalName}Command`,
        importPath: `../application/commands/${commandName.kebabName}.command`,
      }
    : queryName
      ? {
          kind: "query" as const,
          className: `${queryName.pascalName}Query`,
          importPath: `../application/queries/${queryName.kebabName}.query`,
        }
      : crudAction && (crudAction.kind === "create" || crudAction.kind === "update" || crudAction.kind === "delete")
        ? {
            kind: "command" as const,
            className: `${crudAction.classBase}Command`,
            importPath: `../application/commands/${crudAction.fileName}.command`,
          }
        : crudAction
          ? {
              kind: "query" as const,
              className: `${crudAction.classBase}Query`,
              importPath: `../application/queries/${crudAction.fileName}.query`,
            }
          : undefined;

  if (cqrs?.kind === "command") {
    return { ...base, command: { className: cqrs.className, importPath: cqrs.importPath } };
  }

  if (cqrs?.kind === "query") {
    return { ...base, query: { className: cqrs.className, importPath: cqrs.importPath } };
  }

  return base;
}

function createFeatureRouteMethodTs(model: FeatureRouteModel): string {
  const authLine = model.authDecorator ? `  ${model.authDecorator}\n` : "";
  const apiDoc = createRouteApiDocOptions({
    summary: model.summary,
    operationId: model.operationId,
    auth: model.auth,
  });

  if (model.useCase) {
    return `${authLine}  @CallUseCase(${model.useCase.className})
  @RouteIO({ from: ${model.contract.functionName} })
  @${model.decorator}('${model.routePath}', ${apiDoc})
  async ${model.methodName}(): Promise<void> {}`;
  }

  if (model.command) {
    return `${authLine}  @${model.decorator}('${model.routePath}', ${apiDoc})
  async ${model.methodName}(req: Request): Promise<unknown> {
    return this.commandBus.dispatch(new ${model.command.className}(${model.contract.functionName}(req)));
  }`;
  }

  if (model.query) {
    return `${authLine}  @${model.decorator}('${model.routePath}', ${apiDoc})
  async ${model.methodName}(req: Request): Promise<unknown> {
    return this.queryBus.dispatch(new ${model.query.className}(${model.contract.functionName}(req)));
  }`;
  }

  return `${authLine}  @${model.decorator}('${model.routePath}', ${apiDoc})
  async ${model.methodName}(): Promise<unknown> {
    return { resource: '${model.operationId}', action: '${model.methodName}' };
  }`;
}

function createCrudActionModel(routeName: string, resourceNames: ReturnType<typeof createNameVariants>): {
  fileName: string;
  classBase: string;
  operationId: string;
  kind: "list" | "get" | "create" | "update" | "delete";
} | undefined {
  const itemNames = createNameVariants(singularizeResourceName(resourceNames.kebabName));
  const collectionNames = createNameVariants(itemNames.pluralName);

  if (routeName === "list") {
    return {
      fileName: `list-${collectionNames.kebabName}`,
      classBase: `List${collectionNames.pascalName}`,
      operationId: `list${collectionNames.pascalName}`,
      kind: "list",
    };
  }

  if (routeName === "get" || routeName === "create" || routeName === "update" || routeName === "delete") {
    const names = createNameVariants(`${routeName}-${itemNames.kebabName}`);

    return {
      fileName: names.kebabName,
      classBase: names.pascalName,
      operationId: names.camelName,
      kind: routeName,
    };
  }

  return undefined;
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

function createSoapExpressImports(plan: AddRoutePlan, routeDecorator: string): string {
  const imports = new Set(["Controller", routeDecorator]);

  if (plan.useCase) {
    imports.add("CallUseCase");
    imports.add("RouteIO");
  }
  if (plan.command || plan.query) {
    imports.add("Inject");
  }

  const authDecorator = createRouteAuthDecorator(plan.auth, plan.zone, plan.policy);
  if (authDecorator?.startsWith("@Public")) imports.add("Public");
  if (authDecorator?.startsWith("@Auth")) imports.add("Auth");
  if (authDecorator?.startsWith("@AdminOnly")) imports.add("AdminOnly");

  return `import { ${Array.from(imports).sort().join(", ")} } from '@soapjs/soap-express';`;
}

function createRouteAuthDecorator(auth: "none" | AuthCapability, zone: ApiZone, policy?: AuthPolicy): string | undefined {
  if (zone === "public") {
    return "@Public()";
  }

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

function createRouteContractTs(
  className: string,
  camelName: string,
  method: RouteMethod,
  contracts: "plain" | "zod" | undefined
): string {
  const sourceExpression = method === "get" || method === "delete" || method === "head" || method === "options"
    ? "{ ...req.params, ...req.query }"
    : "{ ...req.params, ...req.query, ...req.body }";

  if (contracts === "zod") {
    return `import { Request } from 'express';
import { z } from 'zod';

export const ${camelName}BodySchema = z.record(z.unknown());

export type ${className}RouteInput = z.infer<typeof ${camelName}BodySchema>;

export function ${camelName}BodyContract(req: Request): ${className}RouteInput {
  return ${camelName}BodySchema.parse(${sourceExpression});
}
`;
  }

  return `import { Request } from 'express';

export interface ${className}RouteInput {
  [key: string]: unknown;
}

export function ${camelName}BodyContract(req: Request): ${className}RouteInput {
  return ${sourceExpression};
}
`;
}

function createRouteContractSpecTs(
  kebabName: string,
  camelName: string,
  method: RouteMethod
): string {
  const contractName = `${camelName}BodyContract`;
  const request = method === "get" || method === "delete" || method === "head" || method === "options"
    ? "{ params: { id: 'existing-id' }, query: { include: 'details' }, body: { ignored: true } }"
    : "{ params: { id: 'existing-id' }, query: { mode: 'preview' }, body: { name: 'Ada' } }";
  const expected = method === "get" || method === "delete" || method === "head" || method === "options"
    ? "{ id: 'existing-id', include: 'details' }"
    : "{ id: 'existing-id', mode: 'preview', name: 'Ada' }";

  return `import assert from 'node:assert/strict';
import test from 'node:test';
import { Request } from 'express';
import { ${contractName} } from './${kebabName}.contract';

test('${contractName} maps request input', () => {
  const req = ${request} as unknown as Request;

  assert.deepEqual(${contractName}(req), ${expected});
});
`;
}

function resolveRoutePath(resourcePath: string, routeName: string, routePath?: string): string {
  if (!routePath) {
    return normalizePath(`${resourcePath}/${routeName}`);
  }

  const normalized = normalizePath(routePath);
  if (normalized === resourcePath || normalized.startsWith(`${resourcePath}/`)) {
    return normalized;
  }

  if (!routePath.startsWith("/")) {
    return normalizePath(`${resourcePath}/${routePath}`);
  }

  throw new CliError(`Route path "${routePath}" must be under resource path "${resourcePath}".`);
}

function toControllerRoutePath(resourcePath: string, absoluteRoutePath: string): string {
  if (absoluteRoutePath === resourcePath) {
    return "/";
  }

  return absoluteRoutePath.slice(resourcePath.length) || "/";
}

function normalizePath(value: string): string {
  const normalized = value.replace(/\/+/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function planFeatureRoot(featuresRoot: string, resourceName: string): string {
  return path.posix.join(featuresRoot, resourceName);
}
