import path from "path";
import { ApiZone, AuthCapability, AuthPolicy, ResourceRegistryEntry, RouteRegistryEntry } from "../../config/schemas/types";
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
    auth: plan.auth,
    zone: plan.zone,
    policy: plan.policy,
    generatedAt: new Date().toISOString(),
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
