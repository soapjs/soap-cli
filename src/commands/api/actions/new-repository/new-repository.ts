import chalk from "chalk";
import { Config } from "../../../../core";
import { NewRepositoryInteractiveStrategy } from "./new-repository.interactive-strategy";
import { NewRepositoryOptionsStrategy } from "./new-repository.options-strategy";
import { NewRepositoryOptions } from "./types";

export const newRepository = async (
  options: NewRepositoryOptions,
  config: Config,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewRepositoryOptionsStrategy(config).apply(
      options,
      cliPluginPackageName
    );
  } else {
    new NewRepositoryInteractiveStrategy(config)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
