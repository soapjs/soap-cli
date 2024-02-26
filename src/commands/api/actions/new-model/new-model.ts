import { NewModelOptions } from "./types";
import { NewModelInteractiveStrategy } from "./new-model.interactive-strategy";
import { NewModelOptionsStrategy } from "./new-model.options-strategy";
import { Config } from "../../../../core";
import chalk from "chalk";

export const newModel = async (
  options: NewModelOptions,
  config: Config,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewModelOptionsStrategy(config).apply(options, cliPluginPackageName);
  } else {
    new NewModelInteractiveStrategy(config)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
