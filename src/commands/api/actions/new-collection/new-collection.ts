import chalk from "chalk";
import { Config } from "../../../../core";
import { NewCollectionInteractiveStrategy } from "./new-collection.interactive-strategy";
import { NewCollectionOptionsStrategy } from "./new-collection.options-strategy";
import { NewCollectionOptions } from "./types";

export const newCollection = async (
  options: NewCollectionOptions,
  config: Config,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewCollectionOptionsStrategy(config).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewCollectionInteractiveStrategy(config)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
