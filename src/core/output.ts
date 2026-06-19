export interface Output {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface OutputOptions {
  verbose: boolean;
  silent: boolean;
}

export function createOutput(options: OutputOptions): Output {
  const write = (stream: NodeJS.WriteStream, message: string) => {
    stream.write(`${message}\n`);
  };

  return {
    info(message) {
      if (!options.silent) write(process.stdout, message);
    },
    success(message) {
      if (!options.silent) write(process.stdout, message);
    },
    warn(message) {
      if (!options.silent) write(process.stderr, `Warning: ${message}`);
    },
    error(message) {
      write(process.stderr, `Error: ${message}`);
    },
    debug(message) {
      if (options.verbose && !options.silent) write(process.stderr, `Debug: ${message}`);
    },
  };
}
