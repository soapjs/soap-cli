import chalk from "chalk";
import { Config } from "../../../../core";
import { NewUseCaseInteractiveStrategy } from "./new-use-case.interactive-strategy";
import { NewUseCaseOptionsStrategy } from "./new-use-case.options-strategy";
import { NewUseCaseOptions } from "./types";

export const newUseCase = async (
  options: NewUseCaseOptions,
  config: Config,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewUseCaseOptionsStrategy(config).apply(options, cliPluginPackageName);
  } else {
    new NewUseCaseInteractiveStrategy(config)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
