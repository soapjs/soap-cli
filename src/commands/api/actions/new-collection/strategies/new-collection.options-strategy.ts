import chalk from "chalk";
import { NewCollectionOptions } from "../types";
import { ApiJsonParser } from "../../../common/api-json.parser";
import { ApiGenerator } from "../../../common";
import {
  CliOptionsTools,
  CommandConfig,
  CompilationConfig,
} from "../../../../../core";
import {
  Strategy,
  Texts,
  Config,
  CollectionJson,
} from "@soapjs/soap-cli-common";

export class NewCollectionOptionsStrategy extends Strategy {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }
  public async apply(
    options: NewCollectionOptions,
    cliPluginPackageName: string
  ) {
    const { config, command, compilation } = this;
    const texts = await Texts.load();

    if (!options.endpoint && config.presets.collection.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    const { endpoint, name, model, table } = options;
    const types = CliOptionsTools.splitArrayOption(options.storage);
    const collection: CollectionJson = {
      name,
      endpoint,
      table,
      types,
      model,
    };
    const schema = new ApiJsonParser(config, command, texts).build({
      models: [],
      entities: [],
      collections: [collection],
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
