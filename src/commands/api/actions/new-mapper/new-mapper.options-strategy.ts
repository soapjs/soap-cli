import chalk from "chalk";
import { NewMapperOptions } from "./types";
import {
  CliOptionsTools,
  CommandConfig,
  CompilationConfig,
} from "../../../../core";
import { ApiJsonParser } from "../../common/api-json.parser";
import { ApiGenerator } from "../../common";
import { Config, MapperJson, Strategy, Texts } from "@soapjs/soap-cli-common";

export class NewMapperOptionsStrategy extends Strategy {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }
  public async apply(options: NewMapperOptions, cliPluginPackageName: string) {
    const { config, command, compilation } = this;
    const texts = await Texts.load();

    if (!options.endpoint && config.components.model.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    const { endpoint, name, entity, model } = options;
    const storages = CliOptionsTools.splitArrayOption(options.storage);
    const mapper: MapperJson = {
      name,
      endpoint,
      storages,
      model,
      entity,
    };

    const schema = new ApiJsonParser(config, command, texts).build({
      entities: [],
      models: [],
      mappers: [mapper],
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
