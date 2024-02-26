import chalk from "chalk";
import { EntityJson, NewEntityOptions } from "./types";
import { ApiJsonParser } from "../../common/api-json.parser";
import { ApiGenerator } from "../../common";
import { Strategy, Texts } from "@soapjs/soap-cli-common";
import { Config } from "../../../../core";

export class NewEntityOptionsStrategy extends Strategy {
  constructor(private config: Config) {
    super();
  }
  public async apply(options: NewEntityOptions, cliPluginPackageName: string) {
    const { config } = this;
    const texts = await Texts.load();

    if (!options.endpoint && config.components.model.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    const { endpoint, name, withModel: has_model, props } = options;
    const entity: EntityJson = {
      name,
      endpoint,
      has_model,
      props,
    };
    const schema = new ApiJsonParser(config, texts).build({
      models: [],
      entities: [entity],
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
