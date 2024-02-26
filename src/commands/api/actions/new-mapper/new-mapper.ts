import chalk from "chalk";
import { Config } from "../../../../core";
import { NewMapperInteractiveStrategy } from "./new-mapper.interactive-strategy";
import { NewMapperOptionsStrategy } from "./new-mapper.options-strategy";
import { NewMapperOptions } from "./types";

export const newMapper = async (
  options: NewMapperOptions,
  config: Config,
  cliPluginPackageName: string
) => {
  if (Object.keys(options).includes("name")) {
    new NewMapperOptionsStrategy(config).apply(options, cliPluginPackageName);
  } else {
    new NewMapperInteractiveStrategy(config)
      .apply(cliPluginPackageName)
      .catch((error) => {
        if (error) {
          console.log(chalk.yellow(error));
        }
      });
  }
};
