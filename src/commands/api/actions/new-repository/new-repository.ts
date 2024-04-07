import chalk from "chalk";
import {
  CliOptionsParser,
  CommandConfig,
  CompilationConfig,
} from "../../../../core";
import { NewRepositoryInteractiveStrategy } from "./strategies/new-repository.interactive-strategy";
import { NewRepositoryOptionsStrategy } from "./strategies/new-repository.options-strategy";
import { NewRepositoryOptions } from "./types";
import { Config } from "@soapjs/soap-cli-common";

export const newRepository = async (
  rawOptions: NewRepositoryOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  const options = CliOptionsParser.parse<NewRepositoryOptions>(rawOptions);
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
