import chalk from "chalk";
import { ApiGenerator, ApiJsonParser } from "../../common";
import { Config, ServiceJson, Strategy, Texts } from "@soapjs/soap-cli-common";
import { NewServiceOptions } from "./types";
import {
  CliOptionsTools,
  CommandConfig,
  CompilationConfig,
} from "../../../../core";

export class NewServiceOptionsStrategy extends Strategy {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }

  public async apply(options: NewServiceOptions, cliPluginPackageName: string) {
    const { config, command, compilation } = this;
    const texts = await Texts.load();

    if (!options.endpoint && config.components.service.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    if (!options.layer) {
      console.log(chalk.red(texts.get("missing_layer")));
      process.exit(1);
    }

    const { endpoint, name, layer } = options;
    const methods = CliOptionsTools.splitArrayOption(options.methods);
    const service: ServiceJson = {
      name,
      endpoint,
      methods,
    };
    const schema = new ApiJsonParser(config, command, texts).build({
      models: [],
      entities: [],
      services: [service],
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
