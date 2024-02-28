import { NewServiceOptions } from "./types";
import { NewServiceOptionsStrategy } from "./new-service.options-strategy";
import { NewServiceInteractiveStrategy } from "./new-service.interactive-strategy";
import chalk from "chalk";
import { Config } from "@soapjs/soap-cli-common";
import { CommandConfig, CompilationConfig } from "../../../../core";

export const newService = async (
  options: NewServiceOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewServiceOptionsStrategy(config, command, compilation).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewServiceInteractiveStrategy(config, command, compilation)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
