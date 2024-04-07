import { NewServiceOptions } from "./types";
import { NewServiceOptionsStrategy } from "./strategies/new-service.options-strategy";
import { NewServiceInteractiveStrategy } from "./strategies/new-service.interactive-strategy";
import chalk from "chalk";
import { Config } from "@soapjs/soap-cli-common";
import {
  CliOptionsParser,
  CommandConfig,
  CompilationConfig,
} from "../../../../core";

export const newService = async (
  rawOptions: NewServiceOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  const options = CliOptionsParser.parse<NewServiceOptions>(rawOptions);

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
