import chalk from "chalk";
import { NewControllerOptions } from "./types";
import { ApiJsonParser } from "../../common/api-json.parser";
import {
  CliOptionsTools,
  CommandConfig,
  CompilationConfig,
} from "../../../../core";
import { ApiGenerator } from "../../common";
import {
  Config,
  ControllerJson,
  HandlerJson,
  Strategy,
  Texts,
} from "@soapjs/soap-cli-common";

export class NewControllerOptionsStrategy extends Strategy {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }
  public async apply(
    options: NewControllerOptions,
    cliPluginPackageName: string
  ) {
    const { config, command, compilation } = this;
    const texts = await Texts.load();

    if (
      !options.endpoint &&
      config.components.controller.isEndpointRequired()
    ) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    const { endpoint, name } = options;
    const handlers: HandlerJson[] = [];
    CliOptionsTools.splitArrayOption(options.handlers).forEach((value) => {
      const match = value.match(
        /^(\w+)\s*(\(([a-zA-Z0-9\<\>_ ]+)\))?(:([a-zA-Z0-9\<\>_ ]+))?$/
      );
      if (match) {
        handlers.push({ name: match[1], input: match[3], output: match[5] });
      }
    });

    const controller: ControllerJson = {
      name,
      endpoint,
      handlers,
    };

    const schema = new ApiJsonParser(config, command, texts).build({
      controllers: [controller],
    });
    const result = await new ApiGenerator(
      config,
      compilation,
      cliPluginPackageName
    ).generate(schema);

    if (result.isFailure) {
      console.log(result.failure.error);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}
