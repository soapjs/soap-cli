import { NewEntityOptions } from "./types";
import { NewEntityOptionsStrategy } from "./new-entity.options-strategy";
import { NewEntityInteractiveStrategy } from "./new-entity.interactive-strategy";
import { Config } from "../../../../core";
import chalk from "chalk";

export const newEntity = async (
  options: NewEntityOptions,
  config: Config,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewEntityOptionsStrategy(config).apply(options, cliPluginPackageName);
  } else {
    new NewEntityInteractiveStrategy(config)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
