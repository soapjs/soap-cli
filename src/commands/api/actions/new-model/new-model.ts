import { NewModelOptions } from "./types";
import { NewModelInteractiveStrategy } from "./strategies/new-model.interactive-strategy";
import { NewModelOptionsStrategy } from "./strategies/new-model.options-strategy";
import chalk from "chalk";
import { Config } from "@soapjs/soap-cli-common";
import {
  CliOptionsParser,
  CommandConfig,
  CompilationConfig,
} from "../../../../core";

export const newModel = async (
  rawOptions: NewModelOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  const options = CliOptionsParser.parse<NewModelOptions>(rawOptions);
  if (Object.keys(options).includes("name")) {
    new NewModelOptionsStrategy(config, command, compilation).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewModelInteractiveStrategy(config, command, compilation)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
