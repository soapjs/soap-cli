import { Strategy, Texts } from "@soapjs/soap-cli-common";
import { ApiGenerator } from "../../common/api-generator";
import { ApiJsonParser } from "../../common/api-json.parser";
import { NewEntityStoryboard } from "./new-entity.storyboard";
import { Config } from "../../../../core";

export class NewEntityInteractiveStrategy extends Strategy {
  public readonly name = "new_entity_interactive_strategy";

  constructor(private config: Config) {
    super();
  }

  public async apply(cliPluginPackageName: string) {
    const { config } = this;
    const texts = Texts.load();

    const newEntityStoryboard = new NewEntityStoryboard(texts, config);
    const { content: json, failure } = await newEntityStoryboard.run();

    if (failure) {
      console.log(failure.error);
      process.exit(1);
    }

    const schema = new ApiJsonParser(config, texts).build(json);
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
