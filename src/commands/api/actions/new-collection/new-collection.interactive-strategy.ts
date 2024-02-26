import { Strategy, Texts } from "@soapjs/soap-cli-common";
import { ApiGenerator, ApiJsonParser } from "../../common";
import { NewCollectionStoryboard } from "./new-collection.storyboard";
import { Config } from "../../../../core";

export class NewCollectionInteractiveStrategy extends Strategy {
  public readonly name = "new_collection_interactive_strategy";

  constructor(private config: Config) {
    super();
  }

  public async apply(cliPluginPackageName: string) {
    const { config } = this;
    const texts = Texts.load();

    const newCollectionStoryboard = new NewCollectionStoryboard(texts, config);
    const { content: json, failure } = await newCollectionStoryboard.run();

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
