import { Command } from "commander";
import { CliError } from "../../core/errors";
import { conflictPolicyHelp } from "../../io/conflict-policy";
import { canRunInteractiveMode } from "../../terminal/terminal-capabilities";

export interface InteractiveCommandOptions {
  interactive?: boolean;
}

export interface ConflictCommandOptions {
  onConflict?: string;
}

export function addInteractiveOption<T extends Command>(command: T): T {
  return command.option("-i, --interactive", "run a guided interactive flow", false) as T;
}

export function addConflictOption<T extends Command>(command: T): T {
  return command.option("--on-conflict <policy>", `file conflict policy: ${conflictPolicyHelp()}`) as T;
}

export function assertInteractiveTerminal(options: InteractiveCommandOptions): void {
  if (!options.interactive) {
    return;
  }

  if (!canRunInteractiveMode()) {
    throw new CliError("Interactive mode requires a TTY. Use explicit flags instead.");
  }
}
