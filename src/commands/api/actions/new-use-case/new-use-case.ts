import chalk from "chalk";
import { NewUseCaseInteractiveStrategy } from "./strategies/new-use-case.interactive-strategy";
import { NewUseCaseOptionsStrategy } from "./strategies/new-use-case.options-strategy";
import { NewUseCaseOptions } from "./types";
import { Config } from "@soapjs/soap-cli-common";
import { CommandConfig, CompilationConfig } from "../../../../core";

export const newUseCase = async (
  options: NewUseCaseOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewUseCaseOptionsStrategy(config, command, compilation).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewUseCaseInteractiveStrategy(config, command, compilation)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
