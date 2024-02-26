import { NewRouteOptions } from "./types";
import { NewRouteOptionsStrategy } from "./new-route.options-strategy";
import { NewRouteInteractiveStrategy } from "./new-route.interactive-strategy";
import { Config } from "../../../../core";
import chalk from "chalk";

export const newRoute = async (
  options: NewRouteOptions,
  config: Config,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewRouteOptionsStrategy(config).apply(options, cliPluginPackageName);
  } else {
    new NewRouteInteractiveStrategy(config)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
          console.log(error);
        }
      });
  }
};
