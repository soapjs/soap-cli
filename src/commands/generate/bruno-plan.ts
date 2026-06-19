import path from "path";
import { ResourceFieldDefinition, RouteRegistryEntry, SoapConfig } from "../../config/schemas/types";
import { PlannedFile } from "../../io/file-writer";
import { createNameVariants } from "../../templates/naming";

export interface BrunoGenerationOptions {
  e2e?: boolean;
}

export function createBrunoFiles(config: SoapConfig, options: BrunoGenerationOptions = {}): PlannedFile[] {
  const collectionPath = config.api.bruno.collectionPath || "bruno";
  const environment = config.api.bruno.environment || "Local";
  const files: PlannedFile[] = [
    {
      path: path.posix.join(collectionPath, "bruno.json"),
      type: "bruno",
      content: JSON.stringify(
        {
          version: "1",
          name: config.project.name,
          type: "collection",
        },
        null,
        2
      ),
    },
    {
      path: path.posix.join(collectionPath, "environments", `${environment}.bru`),
      type: "bruno",
      content: `vars {
  baseUrl: ${config.api.baseUrl}
  accessToken:
  apiKey:
  id:
  email: admin@example.com
  password: admin123
}
`,
    },
    {
      path: path.posix.join(collectionPath, "Health", "health.bru"),
      type: "bruno",
      content: createRequestBru({
        name: "Health",
        method: config.api.health.method,
        path: config.api.health.path,
        sequence: 1,
        auth: "none",
      }),
    },
  ];

  if (usesJwtAuth(config.project.capabilities.auth)) {
    files.push(
      {
        path: path.posix.join(collectionPath, "Auth", "login.bru"),
        type: "bruno",
        owner: "auth",
        content: createLoginBru(2),
      },
      {
        path: path.posix.join(collectionPath, "Auth", "me.bru"),
        type: "bruno",
        owner: "auth",
        content: createRequestBru({
          name: "Me",
          method: "GET",
          path: "/auth/me",
          sequence: 3,
          auth: "jwt",
        }),
      }
    );
  }

  const grouped = groupRoutesByResource(config.registry.routes.filter((route) => route.bruno !== false));
  const fieldsByResource = new Map(config.registry.resources.map((resource) => [resource.name, resource.fields]));
  let sequence = usesJwtAuth(config.project.capabilities.auth) ? 4 : 2;

  for (const [resourceName, routes] of Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right))) {
    const resourceNames = createNameVariants(resourceName);

    for (const route of routes.sort(compareRoutes)) {
      const routeNames = createNameVariants(route.name);
      files.push({
        path: path.posix.join(collectionPath, resourceNames.pascalName, `${routeNames.pascalName}.bru`),
        type: "bruno",
        owner: resourceName,
        content: createRequestBru({
          name: routeNames.pascalName,
          method: route.method,
          path: route.path,
          sequence,
          auth: route.auth,
          includeJsonBody: ["POST", "PUT", "PATCH"].includes(route.method.toUpperCase()),
          fields: fieldsByResource.get(resourceName),
          expectBody: route.method.toUpperCase() === "GET" && ["list", "get"].includes(route.name),
          captureId: route.method.toUpperCase() === "POST" && route.name === "create",
        }),
      });
      sequence += 1;
    }
  }

  if (options.e2e) {
    files.push(...createE2eFlowFiles(config, grouped, sequence));
  }

  return files;
}

function compareRoutes(left: RouteRegistryEntry, right: RouteRegistryEntry): number {
  const rank = new Map([
    ["list", 0],
    ["create", 1],
    ["get", 2],
    ["update", 3],
    ["delete", 4],
  ]);
  const leftRank = rank.get(left.name) ?? 100;
  const rightRank = rank.get(right.name) ?? 100;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return `${left.method} ${left.path} ${left.name}`.localeCompare(`${right.method} ${right.path} ${right.name}`);
}

function createE2eFlowFiles(config: SoapConfig, grouped: Map<string, RouteRegistryEntry[]>, startSequence: number): PlannedFile[] {
  const collectionPath = config.api.bruno.collectionPath || "bruno";
  const files: PlannedFile[] = [];
  let sequence = startSequence;

  for (const [resourceName, routes] of Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right))) {
    const crud = resolveCrudRoutes(routes);

    if (!crud) {
      continue;
    }

    const resourceNames = createNameVariants(resourceName);
    const itemNames = createNameVariants(singularizeResourceName(resourceNames.kebabName));
    let step = 1;

    if (usesJwtAuth(config.project.capabilities.auth)) {
      files.push({
        path: path.posix.join(collectionPath, "E2E Flow", `${formatStep(step)}-login.bru`),
        type: "bruno",
        owner: resourceName,
        content: createLoginBru(sequence),
      });
      step += 1;
      sequence += 1;
    }

    const flowSteps: Array<{ label: string; route: RouteRegistryEntry; includeJsonBody?: boolean; expectBody?: boolean; captureId?: boolean }> = [
      { label: `create-${itemNames.kebabName}`, route: crud.create, includeJsonBody: true, captureId: true },
      { label: `get-${itemNames.kebabName}`, route: crud.get, expectBody: true },
      { label: `list-${resourceNames.kebabName}`, route: crud.list, expectBody: true },
      { label: `update-${itemNames.kebabName}`, route: crud.update, includeJsonBody: true, expectBody: true },
      { label: `delete-${itemNames.kebabName}`, route: crud.delete, expectBody: true },
    ];

    for (const flowStep of flowSteps) {
      files.push({
        path: path.posix.join(collectionPath, "E2E Flow", `${formatStep(step)}-${flowStep.label}.bru`),
        type: "bruno",
        owner: resourceName,
        content: createRequestBru({
          name: flowStep.label,
          method: flowStep.route.method,
          path: flowStep.route.path,
          sequence,
          auth: flowStep.route.auth,
          includeJsonBody: flowStep.includeJsonBody,
          fields: config.registry.resources.find((resource) => resource.name === resourceName)?.fields,
          expectBody: flowStep.expectBody,
          captureId: flowStep.captureId,
        }),
      });
      step += 1;
      sequence += 1;
    }
  }

  return files;
}

function resolveCrudRoutes(routes: RouteRegistryEntry[]): {
  list: RouteRegistryEntry;
  get: RouteRegistryEntry;
  create: RouteRegistryEntry;
  update: RouteRegistryEntry;
  delete: RouteRegistryEntry;
} | undefined {
  const byName = new Map(routes.map((route) => [route.name, route]));
  const list = byName.get("list");
  const get = byName.get("get");
  const create = byName.get("create");
  const update = byName.get("update");
  const deleteRoute = byName.get("delete");

  if (!list || !get || !create || !update || !deleteRoute) {
    return undefined;
  }

  return {
    list,
    get,
    create,
    update,
    delete: deleteRoute,
  };
}

function formatStep(value: number): string {
  return String(value).padStart(2, "0");
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

function usesJwtAuth(values: string[]): boolean {
  return values.includes("jwt") || values.includes("local");
}

function createLoginBru(sequence: number): string {
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

function groupRoutesByResource(routes: RouteRegistryEntry[]): Map<string, RouteRegistryEntry[]> {
  const grouped = new Map<string, RouteRegistryEntry[]>();

  for (const route of routes) {
    const routesForResource = grouped.get(route.resource) ?? [];
    routesForResource.push(route);
    grouped.set(route.resource, routesForResource);
  }

  return grouped;
}

function createRequestBru(options: {
  name: string;
  method: string;
  path: string;
  sequence: number;
  auth: string;
  includeJsonBody?: boolean;
  fields?: ResourceFieldDefinition[];
  expectBody?: boolean;
  captureId?: boolean;
}): string {
  const method = options.method.toLowerCase();
  const requestPath = toBrunoPath(options.path);
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
${createExampleJsonBody(options.fields)}
}
`
    : "";
  const createScriptBlock = options.captureId
    ? `
script:post-response {
  const data = res.getBody();
  const id = data?.content?.id || data?.id;
  if (id) {
    bru.setEnvVar("id", id);
  }
}
`
    : "";
  const bodyExpectation = options.expectBody
    ? `
    expect(response.getBody()).to.exist;`
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
  url: {{baseUrl}}${requestPath}
  body: ${bodyType}
  auth: none
}
${authBlock}${bodyBlock}${createScriptBlock}${testsBlock}`;
}

function createExampleJsonBody(fields: ResourceFieldDefinition[] | undefined): string {
  const bodyFields = fields && fields.length > 0
    ? fields
    : [{ name: "name", type: "string", required: true } satisfies ResourceFieldDefinition];
  const body = Object.fromEntries(bodyFields.map((field) => [field.name, exampleValueForField(field)]));

  return JSON.stringify(body, null, 2)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

function exampleValueForField(field: ResourceFieldDefinition): string | number | boolean {
  if (field.type === "number") return 42;
  if (field.type === "boolean") return true;
  if (field.type === "date") return "2026-01-01T00:00:00.000Z";
  return "Example";
}

function toBrunoPath(routePath: string): string {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, "{{$1}}");
}
