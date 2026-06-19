import { CommandContext } from "./command-context";

export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode = 1
  ) {
    super(message);
    this.name = "CliError";
  }
}

export function handleCliError(error: unknown, context: CommandContext): void {
  if (error instanceof Error) {
    context.output.error(error.message);

    if (context.verbose && error.stack) {
      context.output.debug(error.stack);
    }

    return;
  }

  context.output.error(String(error));
}
