import chalk from "chalk";
import { NewControllerOptions } from "../types";
import { ApiJsonParser } from "../../../common/api-json.parser";
import {
  CliOptionsTools,
  CommandConfig,
  CompilationConfig,
} from "../../../../../core";
import { ApiGenerator } from "../../../common";
import {
  Config,
  ControllerJson,
  MethodJson,
  MethodStringParser,
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

    if (!options.endpoint && config.presets.controller.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    const { endpoint, name } = options;
    const handlers: MethodJson[] = [];
    CliOptionsTools.splitArrayOption(options.handlers).forEach((handler) => {
      const json = MethodStringParser.parse(handler);
      handlers.push({
        ...json,
        return_type: json.return_type || `void`,
        is_async: true,
      });
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
