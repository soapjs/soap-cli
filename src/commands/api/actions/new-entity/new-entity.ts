import { NewEntityOptions } from "./types";
import { NewEntityOptionsStrategy } from "./strategies/new-entity.options-strategy";
import { NewEntityInteractiveStrategy } from "./strategies/new-entity.interactive-strategy";
import chalk from "chalk";
import { Config } from "@soapjs/soap-cli-common";
import {
  CliOptionsParser,
  CommandConfig,
  CompilationConfig,
} from "../../../../core";

export const newEntity = async (
  rawOptions: NewEntityOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  const options = CliOptionsParser.parse<NewEntityOptions>(rawOptions);

  if (Object.keys(options).includes("name")) {
    new NewEntityOptionsStrategy(config, command, compilation).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewEntityInteractiveStrategy(config, command, compilation)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
