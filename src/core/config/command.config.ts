import { CliConfig } from "./cli.config";
import { Texts, WriteMethod } from "@soapjs/soap-cli-common";
import { DefaultCliOptions } from "./cli.types";
import { exit } from "process";
import chalk from "chalk";

export type RelativesConfig = {
  noRelatives: boolean;
  skipped: string[];
};

export class CommandConfig {
  static create(
    options: DefaultCliOptions,
    cliConfig: CliConfig,
    texts: Texts
  ) {
    let rel: RelativesConfig;

    if (options.force && options.patch) {
      console.log(
        chalk.yellow(texts.get("do_not_set_force_and_patch_together"))
      );
      exit(1);
    }

    if (options.rel) {
      rel = {
        noRelatives: false,
        skipped: [],
      };
    } else {
      rel = {
        noRelatives: true,
        skipped:
          Array.isArray(options.rel) && options.rel.length > 0
            ? options.rel
            : [
                "model",
                "toolset",
                "entity",
                "use_case",
                "controller",
                "mapper",
                "repository",
                "repository_impl",
                "collection",
                "service",
                "service_impl",
                "route",
                "route_model",
                "route_schema",
                "router",
                "launcher",
                "container",
                "config",
                "route_io",
              ],
      };
    }
    const force = options.force || false;
    const patch = options.patch || false;
    let write_method: WriteMethod;

    if (force) {
      write_method = WriteMethod.Overwrite;
    } else if (patch) {
      write_method = WriteMethod.Patch;
    } else {
      write_method = WriteMethod.Write;
    }

    const no_tests =
      options.tests === undefined ? cliConfig.no_tests : !options.tests;

    return new CommandConfig(no_tests, rel, false, force, patch, write_method);
  }

  constructor(
    public readonly no_tests: boolean,
    public readonly no_rel: RelativesConfig,
    public readonly use_cwd: boolean,
    public readonly force: boolean,
    public readonly patch: boolean,
    public readonly write_method: WriteMethod
  ) {}
}
