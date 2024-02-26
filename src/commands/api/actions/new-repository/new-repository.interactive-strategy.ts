import { Strategy, Texts } from "@soapjs/soap-cli-common";
import { ApiGenerator, ApiJsonParser } from "../../common";
import { NewRepositoryStoryboard } from "./new-repository.storyboard";
import { Config } from "../../../../core";

export class NewRepositoryInteractiveStrategy extends Strategy {
  constructor(private config: Config) {
    super();
  }
  public readonly name = "new_repository_interactive_strategy";
  public async apply(cliPluginPackageName: string) {
    const { config } = this;
    const texts = Texts.load();

    const newRepositoryStoryboard = new NewRepositoryStoryboard(texts, config);
    const { content: json, failure } = await newRepositoryStoryboard.run();

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
