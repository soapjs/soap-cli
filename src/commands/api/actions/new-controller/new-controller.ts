import { NewControllerOptions } from "./types";
import { NewControllerOptionsStrategy } from "./strategies/new-controller.options-strategy";
import { NewControllerInteractiveStrategy } from "./strategies/new-controller.interactive-strategy";
import { CommandConfig, CompilationConfig } from "../../../../core";
import chalk from "chalk";
import { Config } from "@soapjs/soap-cli-common";

export const newController = async (
  options: NewControllerOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewControllerOptionsStrategy(config, command, compilation).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewControllerInteractiveStrategy(config, command, compilation)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(error);
          // console.log(chalk.yellow(error));
        }
      });
  }
};
