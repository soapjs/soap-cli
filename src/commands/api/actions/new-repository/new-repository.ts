import chalk from "chalk";
import { CommandConfig, CompilationConfig } from "../../../../core";
import { NewRepositoryInteractiveStrategy } from "./new-repository.interactive-strategy";
import { NewRepositoryOptionsStrategy } from "./new-repository.options-strategy";
import { NewRepositoryOptions } from "./types";
import { Config } from "@soapjs/soap-cli-common";

export const newRepository = async (
  options: NewRepositoryOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewRepositoryOptionsStrategy(config, command, compilation).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewRepositoryInteractiveStrategy(config, command, compilation)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
