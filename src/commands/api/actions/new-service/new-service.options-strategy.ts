import chalk from "chalk";
import { ServiceJson, NewServiceOptions } from "./types";
import { ApiJsonParser } from "../../common/api-json.parser";
import { CliOptionsTools, Config } from "../../../../core";
import { ApiGenerator } from "../../common";
import { Strategy, Texts } from "@soapjs/soap-cli-common";

export class NewServiceOptionsStrategy extends Strategy {
  constructor(private config: Config) {
    super();
  }

  public async apply(options: NewServiceOptions, cliPluginPackageName: string) {
    const { config } = this;
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
    const schema = new ApiJsonParser(config, texts).build({
      models: [],
      entities: [],
      services: [service],
    });

    const result = await new ApiGenerator(
      config,
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
