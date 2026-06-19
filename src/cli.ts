import { Command } from "commander";
import { createCommandContext, GlobalOptions } from "./core/command-context";
import { handleCliError } from "./core/errors";
import { registerCreateCommand } from "./commands/create/create.command";
import { registerAddCommand } from "./commands/add/add.command";
import { registerGenerateCommand } from "./commands/generate/generate.command";
import { registerInfoCommand } from "./commands/info/info.command";
import { registerDoctorCommand } from "./commands/doctor/doctor.command";
import { registerCheckCommand } from "./commands/check/check.command";
import { registerRemoveCommand } from "./commands/remove/remove.command";
import { registerUpdateCommand } from "./commands/update/update.command";

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("soap")
    .description("Deterministic project and code generator for SoapJS services.")
    .option("--cwd <path>", "working directory", process.cwd())
    .option("--dry-run", "show planned writes without writing files", false)
    .option("--verbose", "show debug logs and stack traces", false)
    .option("--silent", "suppress non-error output", false);

  registerCreateCommand(program);
  registerAddCommand(program);
  registerGenerateCommand(program);

  registerInfoCommand(program);
  registerDoctorCommand(program);
  registerCheckCommand(program);
  registerRemoveCommand(program);
  registerUpdateCommand(program);

  program.hook("preAction", (root, actionCommand) => {
    const options = root.opts<GlobalOptions>();
    actionCommand.setOptionValue("_context", createCommandContext(options));
  });

  return program;
}

export async function runCli(argv: string[]): Promise<void> {
  const program = buildProgram();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    const context = createCommandContext(program.opts<GlobalOptions>());
    handleCliError(error, context);
    process.exitCode = 1;
  }
}
