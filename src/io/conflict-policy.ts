import { CliError } from "../core/errors";

export type ConflictPolicy = "ask" | "skip" | "overwrite" | "new" | "abort";

const conflictPolicies: ConflictPolicy[] = ["ask", "skip", "overwrite", "new", "abort"];

export interface ConflictPolicyOptions {
  force?: boolean;
  writeNew?: boolean;
  skipModified?: boolean;
  onConflict?: string;
}

export function parseConflictPolicy(value: string): ConflictPolicy {
  if (!conflictPolicies.includes(value as ConflictPolicy)) {
    throw new CliError(`Unsupported conflict policy "${value}". Allowed values: ${conflictPolicies.join(", ")}.`);
  }

  return value as ConflictPolicy;
}

export function resolveConflictPolicy(options: ConflictPolicyOptions = {}): ConflictPolicy {
  if (options.onConflict) {
    return parseConflictPolicy(options.onConflict);
  }

  if (options.force) {
    return "overwrite";
  }

  if (options.writeNew) {
    return "new";
  }

  if (options.skipModified) {
    return "skip";
  }

  return "abort";
}

export function conflictPolicyHelp(): string {
  return conflictPolicies.join(", ");
}
