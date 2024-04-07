import { NewRouteOptions } from "./types";
import { NewRouteOptionsStrategy } from "./strategies/new-route.options-strategy";
import { NewRouteInteractiveStrategy } from "./strategies/new-route.interactive-strategy";
import chalk from "chalk";
import { Config } from "@soapjs/soap-cli-common";
import {
  CliOptionsParser,
  CommandConfig,
  CompilationConfig,
} from "../../../../core";

export const newRoute = async (
  rawOptions: NewRouteOptions,
  config: Config,
  command: CommandConfig,
  compilation: CompilationConfig,
  cliPluginPackageName: string
) => {
  const options = CliOptionsParser.parse<NewRouteOptions>(rawOptions);

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
