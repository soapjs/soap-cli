import { NewServiceOptions } from "./types";
import { NewServiceOptionsStrategy } from "./new-service.options-strategy";
import { NewServiceInteractiveStrategy } from "./new-service.interactive-strategy";
import { Config } from "../../../../core";
import chalk from "chalk";

export const newService = async (
  options: NewServiceOptions,
  config: Config,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewServiceOptionsStrategy(config).apply(options, cliPluginPackageName);
  } else {
    new NewServiceInteractiveStrategy(config)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
