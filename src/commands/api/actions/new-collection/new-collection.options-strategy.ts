import chalk from "chalk";
import { CollectionJson, NewCollectionOptions } from "./types";
import { ApiJsonParser } from "../../common/api-json.parser";
import { ApiGenerator } from "../../common";
import { CliOptionsTools, Config } from "../../../../core";
import { Strategy, Texts } from "@soapjs/soap-cli-common";

export class NewCollectionOptionsStrategy extends Strategy {
  constructor(private config: Config) {
    super();
  }
  public async apply(
    options: NewCollectionOptions,
    cliPluginPackageName: string
  ) {
    const { config } = this;
    const texts = await Texts.load();

    if (
      !options.endpoint &&
      config.components.collection.isEndpointRequired()
    ) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    const { endpoint, name, model, table } = options;
    const storages = CliOptionsTools.splitArrayOption(options.storage);
    const collection: CollectionJson = {
      name,
      endpoint,
      table,
      storages,
      model,
    };
    const schema = new ApiJsonParser(config, texts).build({
      models: [],
      entities: [],
      collections: [collection],
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
