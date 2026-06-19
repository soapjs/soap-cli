import { AuthPolicy } from "./schemas/types";
import { CliError } from "../core/errors";

export function parseAuthPolicy(value: string | undefined): AuthPolicy | undefined {
  if (!value || value === "none") {
    return undefined;
  }

  if (value === "admin") {
    return { type: "admin" };
  }

  if (value.startsWith("roles:")) {
    const roles = value.slice("roles:".length).split(",").map((role) => role.trim()).filter(Boolean);

    if (roles.length === 0) {
      throw new CliError("Auth policy roles must include at least one role.");
    }

    return { type: "roles", roles };
  }

  if (value.startsWith("custom:")) {
    const name = value.slice("custom:".length).trim();

    if (!name) {
      throw new CliError("Custom auth policy must include a name.");
    }

    return { type: "custom", name };
  }

  throw new CliError(`Invalid auth policy "${value}". Use admin, roles:a,b, custom:name, or none.`);
}

export function formatAuthPolicy(policy: AuthPolicy | undefined): string | undefined {
  if (!policy) {
    return undefined;
  }

  if (policy.type === "admin") {
    return "admin";
  }

  if (policy.type === "roles") {
    return `roles:${policy.roles.join(",")}`;
  }

  return `custom:${policy.name}`;
}

export function createAuthPolicyArgument(policy: AuthPolicy | undefined): string | undefined {
  if (!policy) {
    return undefined;
  }

  if (policy.type === "admin") {
    return "{ policy: 'admin' }";
  }

  if (policy.type === "roles") {
    return `{ roles: [${policy.roles.map((role) => `'${role}'`).join(", ")}] }`;
  }

  return `{ policy: '${policy.name}' }`;
}
