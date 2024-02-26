import { CliConfig } from "./cli.config";
import { DefaultCliOptions } from "../../commands/api/common/api.types";
import { WriteMethod } from "@soapjs/soap-cli-common";

export class CommandConfig {
  static create(options: DefaultCliOptions, cliConfig: CliConfig) {
    const with_dependencies =
      options.withDeps === undefined
        ? cliConfig.with_dependencies
        : options.withDeps;
    const write_method = options.force
      ? WriteMethod.Overwrite
      : WriteMethod.Write;
    const skip_tests =
      options.skipTests === undefined
        ? cliConfig.skip_tests
        : options.skipTests;
    const dependencies_write_method = with_dependencies
      ? write_method
      : WriteMethod.Skip;

    return new CommandConfig(
      skip_tests,
      with_dependencies,
      false,
      options.force,
      write_method,
      dependencies_write_method
    );
  }

  constructor(
    public readonly skip_tests: boolean,
    public readonly with_dependencies: boolean,
    public readonly use_cwd: boolean,
    public readonly force: boolean,
    public readonly write_method: WriteMethod,
    public readonly dependencies_write_method: WriteMethod
  ) {}
}
