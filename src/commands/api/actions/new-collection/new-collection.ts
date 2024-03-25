import chalk from "chalk";
import { Config } from "@soapjs/soap-cli-common";
import { NewCollectionInteractiveStrategy } from "./strategies/new-collection.interactive-strategy";
import { NewCollectionOptionsStrategy } from "./strategies/new-collection.options-strategy";
import { NewCollectionOptions } from "./types";
import { CommandConfig, CompilationConfig } from "../../../../core";

export const newCollection = async (
  options: NewCollectionOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewCollectionOptionsStrategy(config, command, compilation).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewCollectionInteractiveStrategy(config, command, compilation)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
