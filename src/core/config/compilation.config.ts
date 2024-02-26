import os from "os";
import { CliConfig } from "./cli.config";
import { LanguageConfigJson } from "@soapjs/soap-cli-common";

export class CompilationConfig {
  public static create(
    cliConfig: CliConfig,
    languageConfig: LanguageConfigJson
  ): CompilationConfig {
    const thread_count = cliConfig.thread_count
      ? cliConfig.thread_count === -1
        ? os.cpus().length
        : cliConfig.thread_count
      : 2;

    return new CompilationConfig(
      languageConfig.source_path || "src",
      cliConfig.batch_size || 10,
      thread_count,
      cliConfig.transport || "file"
    );
  }

  constructor(
    public readonly sourceDirname: string,
    public readonly batchSize: number,
    public readonly threadCount: number,
    public readonly transport: string
  ) {}
}
