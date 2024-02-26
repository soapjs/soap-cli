import { Strategy, Texts } from "@soapjs/soap-cli-common";
import { ApiGenerator, ApiJsonParser } from "../../common";
import { NewMapperStoryboard } from "./new-mapper.storyboard";
import { Config } from "../../../../core";

export class NewMapperInteractiveStrategy extends Strategy {
  public readonly name = "new_mapper_interactive_strategy";

  constructor(private config: Config) {
    super();
  }

  public async apply(cliPluginPackageName: string) {
    const { config } = this;
    const texts = Texts.load();

    const newMapperStoryboard = new NewMapperStoryboard(texts, config);
    const { content: json, failure } = await newMapperStoryboard.run();

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
