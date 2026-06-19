import fs from "fs";
import path from "path";
import { Command } from "commander";
import { loadSoapConfig } from "../../config/load-soap-config";
import { ApiZone, AuthCapability, RouteRegistryEntry, SoapConfig } from "../../config/schemas/types";
import { getCommandContext } from "../../core/command-context";
import { CliError } from "../../core/errors";
import { createNameVariants } from "../../templates/naming";

const allowedZones: ApiZone[] = ["public", "private", "admin"];
const allowedAuth: Array<"none" | "jwt" | "api-key"> = ["none", "jwt", "api-key"];

export function registerCheckCommand(program: Command): void {
  const check = program.command("check").description("Validate generated SoapJS project metadata.");

  check
    .command("routes")
    .description("Validate route registry consistency.")
    .action(async (_options: unknown, command: Command) => {
      const context = getCommandContext(command);
      const config = await loadSoapConfig(context.cwd);
      const errors = checkRoutes(config);

      if (errors.length > 0) {
        for (const error of errors) {
          context.output.error(error);
        }

        throw new CliError(`Route check failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}.`);
      }

      context.output.success(`Route registry is valid (${config.registry.routes.length} routes).`);
    });
}

function checkRoutes(config: SoapConfig): string[] {
  const errors: string[] = [];
  const routeKeys = new Map<string, RouteRegistryEntry>();
  const resourceNames = new Set(config.registry.resources.map((resource) => resource.name));

  for (const route of config.registry.routes) {
    const label = `${route.method.toUpperCase()} ${route.path}`;
    const key = label.toLowerCase();
    const duplicate = routeKeys.get(key);

    if (duplicate) {
      errors.push(`Duplicate route ${label} used by ${duplicate.resource}/${duplicate.name} and ${route.resource}/${route.name}.`);
    } else {
      routeKeys.set(key, route);
    }

    if (!resourceNames.has(route.resource)) {
      errors.push(`Route ${route.resource}/${route.name} references unknown resource "${route.resource}".`);
    }

    if (!allowedZones.includes(route.zone)) {
      errors.push(`Route ${route.resource}/${route.name} uses unknown zone "${route.zone}".`);
    } else if (!config.project.zones.includes(route.zone)) {
      errors.push(`Route ${route.resource}/${route.name} uses zone "${route.zone}" that is not enabled for this project.`);
    }

    if (!allowedAuth.includes(route.auth as "none" | "jwt" | "api-key")) {
      errors.push(`Route ${route.resource}/${route.name} uses unknown auth strategy "${route.auth}".`);
    } else if (
      route.auth !== "none" &&
      !enabledRouteAuthValues(config.project.capabilities.auth).includes(route.auth as "jwt" | "api-key")
    ) {
      errors.push(`Route ${route.resource}/${route.name} uses auth strategy "${route.auth}" that is not enabled for this project.`);
    }

    if (route.policy) {
      errors.push(...checkAuthPolicy(route));
    }

    const contractPaths = expectedContractPaths(config, route);
    if (!contractPaths.some((contractPath) => fs.existsSync(path.join(config.root, contractPath)))) {
      errors.push(`Route ${route.resource}/${route.name} is missing contract file (${contractPaths.join(" or ")}).`);
    }

    if ((config.api.bruno.enabled || config.project.capabilities.apiClient.includes("bruno")) && route.bruno !== false) {
      const brunoPath = expectedBrunoPath(config, route);
      if (!fs.existsSync(path.join(config.root, brunoPath))) {
        errors.push(`Route ${route.resource}/${route.name} is missing Bruno file ${brunoPath}.`);
      }
    }
  }

  return errors;
}

function checkAuthPolicy(route: RouteRegistryEntry): string[] {
  const errors: string[] = [];

  if (route.auth === "none") {
    errors.push(`Route ${route.resource}/${route.name} uses auth policy without route auth.`);
  }

  if (route.policy?.type === "roles" && route.policy.roles.length === 0) {
    errors.push(`Route ${route.resource}/${route.name} uses roles policy without roles.`);
  }

  if (route.policy?.type === "custom" && route.policy.name.trim().length === 0) {
    errors.push(`Route ${route.resource}/${route.name} uses custom policy without a name.`);
  }

  return errors;
}

function enabledRouteAuthValues(values: AuthCapability[]): Array<"none" | "jwt" | "api-key"> {
  const allowed: Array<"none" | "jwt" | "api-key"> = ["none"];

  if (values.includes("jwt") || values.includes("local")) {
    allowed.push("jwt");
  }

  if (values.includes("api-key")) {
    allowed.push("api-key");
  }

  return allowed;
}

function expectedContractPaths(config: SoapConfig, route: RouteRegistryEntry): string[] {
  const resourceNames = createNameVariants(route.resource);
  const routeNames = createNameVariants(route.name);
  const contractNames = Array.from(
    new Set([routeNames.kebabName, `${routeNames.kebabName}-${resourceNames.kebabName}`, `${routeNames.kebabName}-${resourceNames.pluralName}`])
  );

  return contractNames.map((contractName) =>
    path.posix.join(
      config.structure.featuresRoot,
      resourceNames.kebabName,
      config.structure.paths.contracts,
      `${contractName}.contract.ts`
    )
  );
}

function expectedBrunoPath(config: SoapConfig, route: RouteRegistryEntry): string {
  const resourceNames = createNameVariants(route.resource);
  const routeNames = createNameVariants(route.name);

  return path.posix.join(config.api.bruno.collectionPath, resourceNames.pascalName, `${routeNames.pascalName}.bru`);
}
