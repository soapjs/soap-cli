import { NewToolsetOptions } from "./types";
import { NewToolsetOptionsStrategy } from "./new-toolset.options-strategy";
import { NewToolsetInteractiveStrategy } from "./new-toolset.interactive-strategy";
import chalk from "chalk";
import { Config } from "@soapjs/soap-cli-common";
import { CommandConfig, CompilationConfig } from "../../../../core";

export const newToolset = async (
  options: NewToolsetOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewToolsetOptionsStrategy(config, command, compilation).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewToolsetInteractiveStrategy(config, command, compilation)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
