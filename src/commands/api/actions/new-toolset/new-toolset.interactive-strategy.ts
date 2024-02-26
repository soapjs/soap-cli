import { Strategy, Texts } from "@soapjs/soap-cli-common";

import { ApiGenerator } from "../../common/api-generator";
import { ApiJsonParser } from "../../common/api-json.parser";
import { NewToolsetStoryboard } from "./new-toolset.storyboard";
import { Config } from "../../../../core";

export class NewToolsetInteractiveStrategy extends Strategy {
  public readonly name = "new_toolset_interactive_strategy";

  constructor(private config: Config) {
    super();
  }

  public async apply(cliPluginPackageName: string) {
    const { config } = this;
    const texts = Texts.load();

    const newModelStoryboard = new NewToolsetStoryboard(texts, config);
    const { content: json, failure } = await newModelStoryboard.run();

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
