import { NewToolsetOptions } from "./types";
import { NewToolsetOptionsStrategy } from "./new-toolset.options-strategy";
import { NewToolsetInteractiveStrategy } from "./new-toolset.interactive-strategy";
import { Config } from "../../../../core";
import chalk from "chalk";

export const newToolset = async (
  options: NewToolsetOptions,
  config: Config,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewToolsetOptionsStrategy(config).apply(options, cliPluginPackageName);
  } else {
    new NewToolsetInteractiveStrategy(config)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
