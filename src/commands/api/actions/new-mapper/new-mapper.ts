import chalk from "chalk";
import { NewMapperInteractiveStrategy } from "./new-mapper.interactive-strategy";
import { NewMapperOptionsStrategy } from "./new-mapper.options-strategy";
import { NewMapperOptions } from "./types";
import { Config } from "@soapjs/soap-cli-common";
import { CommandConfig, CompilationConfig } from "../../../../core";

export const newMapper = async (
  options: NewMapperOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewMapperOptionsStrategy(config, command, compilation).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewMapperInteractiveStrategy(config, command, compilation)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
