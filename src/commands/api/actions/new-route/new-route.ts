import { NewRouteOptions } from "./types";
import { NewRouteOptionsStrategy } from "./new-route.options-strategy";
import { NewRouteInteractiveStrategy } from "./new-route.interactive-strategy";
import chalk from "chalk";
import { Config } from "@soapjs/soap-cli-common";
import { CommandConfig, CompilationConfig } from "../../../../core";

export const newRoute = async (
  options: NewRouteOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewRouteOptionsStrategy(config, command, compilation).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewRouteInteractiveStrategy(config, command, compilation)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
          console.log(error);
        }
      });
  }
};
