import path from "path";
import { Output, createOutput } from "./output";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface GlobalOptions {
  cwd?: string;
  verbose?: boolean;
  silent?: boolean;
  dryRun?: boolean;
}

export interface CommandContext {
  cwd: string;
  verbose: boolean;
  silent: boolean;
  dryRun: boolean;
  packageManager?: PackageManager;
  output: Output;
}

export function createCommandContext(options: GlobalOptions = {}): CommandContext {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const verbose = Boolean(options.verbose);
  const silent = Boolean(options.silent);
  const dryRun = Boolean(options.dryRun);

  return {
    cwd,
    verbose,
    silent,
    dryRun,
    output: createOutput({ verbose, silent }),
  };
}

export function getCommandContext(command: { getOptionValue(name: string): unknown }): CommandContext {
  const context = command.getOptionValue("_context");

  if (!context) {
    return createCommandContext();
  }

  return context as CommandContext;
}
